// lib/analyzer.ts
export interface AnalysisResult {
  score: number
  metrics: {
    timingCluster: number
    walletSimilarity: number
    sizePatterns: number
    distribution: number
  }
  details: {
    totalTransactions: number
    uniqueWallets: number
    analysisPeriod: string
    suspiciousWallets: number
  }
  insights: {
    riskLevel: string
    primaryConcerns: string[]
    recommendations: string[]
    explanation: string
  }
}

interface TokenTransfer {
  signature: string
  timestamp: number
  from: string
  to: string
  amount: number
  slot: number
}

interface SignatureResult {
  signature: string
}

export async function analyzeToken(
  contractAddress: string,
  period: 'launch' | 'recent' | 'custom',
  apiKey: string
): Promise<AnalysisResult> {
  if (!apiKey) {
    throw new Error(
      'Helius API key is required. Please configure it in Settings.'
    )
  }

  console.log(`Analyzing ${contractAddress} for ${period} period`)

  try {
    // Get token transfers
    const transfers = await getTokenTransfers(contractAddress, period, apiKey)

    if (transfers.length === 0) {
      throw new Error('No transactions found for this token')
    }

    // Analyze the transfers
    const analysis = await analyzeBundlingPatterns(transfers)

    return analysis
  } catch (error) {
    console.error('Analysis failed:', error)
    throw new Error(
      `Analysis failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

async function getTokenTransfers(
  contractAddress: string,
  period: string,
  apiKey: string
): Promise<TokenTransfer[]> {
  const HELIUS_URL = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`

  try {
    // Step 1: Get signatures for the token address using standard RPC
    const signaturesResponse = await fetch(HELIUS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-signatures',
        method: 'getSignaturesForAddress',
        params: [
          contractAddress,
          {
            limit: period === 'recent' ? 50 : 25,
            commitment: 'confirmed',
          },
        ],
      }),
    })

    const signaturesData = await signaturesResponse.json()

    if (signaturesData.error) {
      // If long-term storage fails, try with fewer results
      if (signaturesData.error.message?.includes('long-term storage')) {
        console.warn('Long-term storage issue, trying with reduced limit...')
        return await getTokenTransfersWithReducedLimit(
          contractAddress,
          10,
          apiKey
        )
      }
      throw new Error(`Helius RPC error: ${signaturesData.error.message}`)
    }

    const signatures = signaturesData.result || []

    if (signatures.length === 0) {
      throw new Error('No transactions found for this token address')
    }

    // Step 2: Use Helius Enhanced Transactions API with smaller batches
    const batchSize = 10
    const transfers: TokenTransfer[] = []

    for (let i = 0; i < Math.min(signatures.length, 20); i += batchSize) {
      const batch = signatures.slice(i, i + batchSize)

      try {
        const enhancedResponse = await fetch(
          `https://api.helius.xyz/v0/transactions?api-key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transactions: batch.map((sig: SignatureResult) => sig.signature),
            }),
          }
        )

        if (!enhancedResponse.ok) {
          console.warn(
            `Enhanced API batch failed: ${enhancedResponse.status}, continuing with next batch...`
          )
          continue
        }

        const enhancedData = await enhancedResponse.json()

        // Parse enhanced transactions to extract token transfers
        for (const tx of enhancedData) {
          if (!tx || tx.transactionError) continue

          const timestamp = tx.timestamp ? tx.timestamp * 1000 : Date.now()
          const signature = tx.signature
          const slot = tx.slot || 0

          // Extract token transfers from the enhanced transaction
          if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
            for (const transfer of tx.tokenTransfers) {
              // Only include transfers for our target token
              if (
                transfer.mint === contractAddress &&
                transfer.tokenAmount > 0
              ) {
                transfers.push({
                  signature,
                  timestamp,
                  from: transfer.fromUserAccount || 'unknown',
                  to: transfer.toUserAccount || 'unknown',
                  amount: transfer.tokenAmount || 0,
                  slot,
                })
              }
            }
          }
        }

        // Small delay between batches to be nice to the API
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (batchError) {
        console.warn('Batch processing error, continuing:', batchError)
        continue
      }
    }

    if (transfers.length === 0) {
      throw new Error('No token transfers found in the analyzed transactions')
    }

    return transfers
  } catch (error) {
    console.error('Error fetching token transfers:', error)
    throw error
  }
}

// Fallback function with very reduced limits
async function getTokenTransfersWithReducedLimit(
  contractAddress: string,
  limit: number,
  apiKey: string
): Promise<TokenTransfer[]> {
  const HELIUS_URL = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`

  const signaturesResponse = await fetch(HELIUS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'get-signatures-reduced',
      method: 'getSignaturesForAddress',
      params: [
        contractAddress,
        {
          limit,
          commitment: 'confirmed',
        },
      ],
    }),
  })

  const signaturesData = await signaturesResponse.json()

  if (signaturesData.error) {
    throw new Error(
      `Reduced query also failed: ${signaturesData.error.message}`
    )
  }

  const signatures = signaturesData.result || []

  if (signatures.length === 0) {
    throw new Error('No recent transactions found for this token')
  }

  // Try enhanced API with just the most recent few transactions
  const enhancedResponse = await fetch(
    `https://api.helius.xyz/v0/transactions?api-key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transactions: signatures
          .slice(0, 5)
          .map((sig: SignatureResult) => sig.signature),
      }),
    }
  )

  if (!enhancedResponse.ok) {
    throw new Error(
      `Enhanced API failed even with reduced data: ${enhancedResponse.status}`
    )
  }

  const enhancedData = await enhancedResponse.json()
  const transfers: TokenTransfer[] = []

  for (const tx of enhancedData) {
    if (!tx || tx.transactionError) continue

    const timestamp = tx.timestamp ? tx.timestamp * 1000 : Date.now()
    const signature = tx.signature
    const slot = tx.slot || 0

    if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
      for (const transfer of tx.tokenTransfers) {
        if (transfer.mint === contractAddress && transfer.tokenAmount > 0) {
          transfers.push({
            signature,
            timestamp,
            from: transfer.fromUserAccount || 'unknown',
            to: transfer.toUserAccount || 'unknown',
            amount: transfer.tokenAmount || 0,
            slot,
          })
        }
      }
    }
  }

  return transfers
}

async function analyzeBundlingPatterns(
  transfers: TokenTransfer[]
): Promise<AnalysisResult> {
  // Basic analysis implementation
  const uniqueWallets = new Set([
    ...transfers.map((t) => t.from),
    ...transfers.map((t) => t.to),
  ])
  const totalTransactions = transfers.length

  // Time clustering analysis
  const timingScore = analyzeTimeClustering(transfers)

  // Wallet similarity analysis
  const walletScore = analyzeWalletPatterns(transfers)

  // Transaction size patterns
  const sizeScore = analyzeTransactionSizes(transfers)

  // Distribution analysis
  const distributionScore = analyzeDistribution(transfers)

  // Calculate overall score
  const overallScore = Math.round(
    timingScore * 0.4 +
      walletScore * 0.3 +
      sizeScore * 0.2 +
      distributionScore * 0.1
  )

  // Count suspicious wallets (simple heuristic)
  const suspiciousWallets = countSuspiciousWallets(transfers)

  // Generate insights
  const insights = generateInsights(overallScore, {
    timingScore,
    walletScore,
    sizeScore,
    distributionScore,
  })

  return {
    score: overallScore,
    metrics: {
      timingCluster: timingScore,
      walletSimilarity: walletScore,
      sizePatterns: sizeScore,
      distribution: distributionScore,
    },
    details: {
      totalTransactions,
      uniqueWallets: uniqueWallets.size,
      analysisPeriod: getPeriodString(transfers),
      suspiciousWallets,
    },
    insights,
  }
}

function analyzeTimeClustering(transfers: TokenTransfer[]): number {
  if (transfers.length < 2) return 0

  // Sort by timestamp
  const sorted = transfers.sort((a, b) => a.timestamp - b.timestamp)

  // Look for clusters of transactions within short time windows
  const timeWindows = [30, 60, 300] // 30s, 1min, 5min windows
  let maxClusterScore = 0

  for (const windowMs of timeWindows) {
    const clusters = []
    let currentCluster = [sorted[0]]

    for (let i = 1; i < sorted.length; i++) {
      const timeDiff = sorted[i].timestamp - sorted[i - 1].timestamp

      if (timeDiff <= windowMs * 1000) {
        currentCluster.push(sorted[i])
      } else {
        if (currentCluster.length > 1) {
          clusters.push(currentCluster)
        }
        currentCluster = [sorted[i]]
      }
    }

    if (currentCluster.length > 1) {
      clusters.push(currentCluster)
    }

    // Score based on largest cluster size
    const maxClusterSize = Math.max(...clusters.map((c) => c.length), 0)
    const clusterScore = Math.min(100, (maxClusterSize / sorted.length) * 200)
    maxClusterScore = Math.max(maxClusterScore, clusterScore)
  }

  return Math.round(maxClusterScore)
}

function analyzeWalletPatterns(transfers: TokenTransfer[]): number {
  // Simple wallet pattern analysis
  const walletCounts = new Map<string, number>()

  transfers.forEach((transfer) => {
    walletCounts.set(transfer.to, (walletCounts.get(transfer.to) || 0) + 1)
  })

  const counts = Array.from(walletCounts.values())
  const avgTransactionsPerWallet =
    counts.reduce((a, b) => a + b, 0) / counts.length

  // Higher score if wallets have similar transaction counts
  const variance =
    counts.reduce(
      (acc, count) => acc + Math.pow(count - avgTransactionsPerWallet, 2),
      0
    ) / counts.length
  const coefficient =
    variance > 0 ? Math.sqrt(variance) / avgTransactionsPerWallet : 0

  // Lower coefficient = more similar = higher suspicion
  return Math.round(Math.max(0, 100 - coefficient * 50))
}

function analyzeTransactionSizes(transfers: TokenTransfer[]): number {
  if (transfers.length < 2) return 0

  const amounts = transfers.map((t) => t.amount)
  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length

  // Check for suspiciously similar amounts
  const variance =
    amounts.reduce((acc, amount) => acc + Math.pow(amount - avg, 2), 0) /
    amounts.length
  const stdDev = Math.sqrt(variance)
  const coefficient = avg > 0 ? stdDev / avg : 0

  // Lower coefficient = more similar amounts = higher suspicion
  return Math.round(Math.max(0, 100 - coefficient * 100))
}

function analyzeDistribution(transfers: TokenTransfer[]): number {
  // Analyze how concentrated the buying is
  const buyerAmounts = new Map<string, number>()

  transfers.forEach((transfer) => {
    const current = buyerAmounts.get(transfer.to) || 0
    buyerAmounts.set(transfer.to, current + transfer.amount)
  })

  const amounts = Array.from(buyerAmounts.values()).sort((a, b) => b - a)
  const totalAmount = amounts.reduce((a, b) => a + b, 0)

  // Calculate Gini coefficient (concentration)
  if (amounts.length < 2 || totalAmount === 0) return 0

  let gini = 0
  for (let i = 0; i < amounts.length; i++) {
    for (let j = 0; j < amounts.length; j++) {
      gini += Math.abs(amounts[i] - amounts[j])
    }
  }

  gini = gini / (2 * amounts.length * totalAmount)

  // Higher Gini = more concentrated = more suspicious
  return Math.round(gini * 100)
}

function countSuspiciousWallets(transfers: TokenTransfer[]): number {
  // Simple heuristic: wallets with multiple transactions in short time
  const walletTimes = new Map<string, number[]>()

  transfers.forEach((transfer) => {
    if (!walletTimes.has(transfer.to)) {
      walletTimes.set(transfer.to, [])
    }
    walletTimes.get(transfer.to)!.push(transfer.timestamp)
  })

  let suspicious = 0
  walletTimes.forEach((times) => {
    if (times.length > 1) {
      times.sort((a, b) => a - b)
      // Check for multiple transactions within 5 minutes
      for (let i = 1; i < times.length; i++) {
        if (times[i] - times[i - 1] < 300000) {
          // 5 minutes
          suspicious++
          break
        }
      }
    }
  })

  return suspicious
}

function generateInsights(
  overallScore: number,
  metrics: {
    timingScore: number
    walletScore: number
    sizeScore: number
    distributionScore: number
  }
) {
  const concerns = []
  const recommendations = []

  // Analyze each metric for concerns
  if (metrics.timingScore > 70) {
    concerns.push('High coordination in transaction timing')
    recommendations.push(
      'Investigate if transactions came from known bundling services'
    )
  }

  if (metrics.walletScore > 60) {
    concerns.push('Similar wallet behavior patterns detected')
    recommendations.push(
      'Check if suspicious wallets share funding sources or creation dates'
    )
  }

  if (metrics.sizeScore > 60) {
    concerns.push('Automated transaction sizing patterns')
    recommendations.push('Verify if similar amounts indicate bot activity')
  }

  if (metrics.distributionScore > 70) {
    concerns.push('High token concentration among few holders')
    recommendations.push(
      'Monitor large holders for potential coordinated selling'
    )
  }

  // Generate risk level
  let riskLevel = 'Low Risk'
  if (overallScore >= 80) riskLevel = 'High Risk'
  else if (overallScore >= 60) riskLevel = 'Medium Risk'
  else if (overallScore >= 40) riskLevel = 'Moderate Risk'

  // Generate explanation
  let explanation = ''
  if (overallScore >= 70) {
    explanation =
      'Multiple indicators suggest coordinated buying activity. This could indicate bundled transactions, bot activity, or market manipulation.'
  } else if (overallScore >= 40) {
    explanation =
      'Some patterns suggest possible coordination, but could also be normal market behavior during high activity periods.'
  } else {
    explanation =
      'Transaction patterns appear mostly organic with natural distribution and timing.'
  }

  if (concerns.length === 0) {
    concerns.push('No major red flags detected')
    recommendations.push(
      'Continue monitoring for any changes in trading patterns'
    )
  }

  return {
    riskLevel,
    primaryConcerns: concerns,
    recommendations,
    explanation,
  }
}

function getPeriodString(transfers: TokenTransfer[]): string {
  if (transfers.length === 0) return '0h'

  const times = transfers.map((t) => t.timestamp).sort((a, b) => a - b)
  const duration = times[times.length - 1] - times[0]
  const hours = Math.round(duration / (1000 * 60 * 60))

  if (hours < 24) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}
