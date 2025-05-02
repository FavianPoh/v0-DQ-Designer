import type { DataRecord, DataTables } from "./types"

export function generateSyntheticData(count: number): DataTables {
  return {
    users: generateUserData(count),
    transactions: generateTransactionData(count),
  }
}

function generateUserData(count: number): DataRecord[] {
  const data: DataRecord[] = []
  const regions = ["North", "South", "East", "West", "Central"]

  for (let i = 0; i < count; i++) {
    // Introduce data quality issues randomly
    const hasIssue = Math.random() < 0.3
    const issueType = Math.floor(Math.random() * 5)

    let probability = Math.random()
    let name = `User ${i + 1}`
    let email = `user${i + 1}@example.com`
    let age = Math.floor(Math.random() * 60) + 18
    const isActive = Math.random() > 0.3
    const createdAt = new Date(Date.now() - Math.random() * 10000000000)
    let updatedAt = new Date(createdAt.getTime() + Math.random() * 5000000000)
    const status = ["active", "pending", "inactive"][Math.floor(Math.random() * 3)]
    let score = Math.floor(Math.random() * 100)
    const category = ["A", "B", "C"][Math.floor(Math.random() * 3)]
    // Add regionId as a common column
    const regionId = Math.floor(Math.random() * 5) + 1
    const region = regions[regionId - 1]

    // Introduce data quality issues
    if (hasIssue) {
      switch (issueType) {
        case 0:
          // Negative probability (invalid range)
          probability = -0.2
          break
        case 1:
          // Probability > 1 (invalid range)
          probability = 1.2
          break
        case 2:
          // Empty name (required field)
          name = ""
          break
        case 3:
          // Invalid email format
          email = "invalid-email"
          break
        case 4:
          // Type mismatch
          age = "twenty" as any
          break
      }
    }

    // Randomly introduce null values
    if (Math.random() < 0.05) {
      score = null as any
    }

    // Randomly introduce missing dates
    if (Math.random() < 0.05) {
      updatedAt = null as any
    }

    data.push({
      id: i + 1,
      name,
      email,
      age,
      probability,
      isActive,
      createdAt,
      updatedAt,
      status,
      score,
      category,
      regionId,
      region,
    })
  }

  return data
}

function generateTransactionData(count: number): DataRecord[] {
  const data: DataRecord[] = []
  const transactionTypes = ["purchase", "refund", "subscription", "cancellation"]
  const paymentMethods = ["credit_card", "paypal", "bank_transfer", "crypto"]
  const regions = ["North", "South", "East", "West", "Central"]

  for (let i = 0; i < count * 2; i++) {
    // Link to user table with userId
    const userId = Math.floor(Math.random() * count) + 1

    // Generate transaction data - using let instead of const for variables that might be modified
    let amount = Math.round(Math.random() * 10000) / 100
    const transactionType = transactionTypes[Math.floor(Math.random() * transactionTypes.length)]
    let paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)]
    const transactionDate = new Date(Date.now() - Math.random() * 31536000000) // Within last year
    let status = ["completed", "pending", "failed", "disputed"][Math.floor(Math.random() * 4)]

    // Add regionId as a common column - sometimes matching the user's region, sometimes not
    const regionId =
      Math.random() < 0.8
        ? data.find((t) => t.userId === userId)?.regionId || Math.floor(Math.random() * 5) + 1
        : Math.floor(Math.random() * 5) + 1
    const region = regions[regionId - 1]

    // Introduce data quality issues randomly
    const hasIssue = Math.random() < 0.3
    let refundAmount = transactionType === "refund" ? amount : 0
    const processingFee = Math.round(amount * 0.025 * 100) / 100 // 2.5% fee

    // Introduce data quality issues
    if (hasIssue) {
      const issueType = Math.floor(Math.random() * 4)

      switch (issueType) {
        case 0:
          // Negative amount (invalid for purchases)
          if (transactionType === "purchase") {
            amount = -amount
          }
          break
        case 1:
          // Refund amount greater than purchase amount
          if (transactionType === "refund") {
            refundAmount = amount * 1.2
          }
          break
        case 2:
          // Missing payment method
          if (Math.random() < 0.5) {
            paymentMethod = "" as any
          }
          break
        case 3:
          // Inconsistent status
          if (transactionType === "refund" && Math.random() < 0.7) {
            status = "completed"
          } else if (transactionType === "cancellation" && Math.random() < 0.7) {
            status = "pending"
          }
          break
      }
    }

    data.push({
      id: i + 1,
      userId,
      transactionType,
      amount,
      refundAmount,
      processingFee,
      paymentMethod,
      transactionDate,
      status,
      currency: "USD",
      notes: Math.random() < 0.3 ? `Transaction note for ${i}` : null,
      regionId,
      region,
    })
  }

  return data
}
