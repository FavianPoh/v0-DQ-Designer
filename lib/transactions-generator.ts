import type { DataRecord } from "./types"

export function generateTransactionsData(count: number, users: DataRecord[]): DataRecord[] {
  const transactions: DataRecord[] = []
  const paymentMethods = ["credit_card", "debit_card", "bank_transfer", "paypal", "crypto"]
  const categories = ["shopping", "food", "entertainment", "bills", "travel"]
  const statuses = ["completed", "pending", "failed", "refunded"]

  for (let i = 0; i < count; i++) {
    // Randomly select a user for this transaction
    const userIndex = Math.floor(Math.random() * users.length)
    const user = users[userIndex]

    // Base transaction data
    let amount = Number.parseFloat((Math.random() * 500 + 10).toFixed(2))
    let paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)]
    let category = categories[Math.floor(Math.random() * categories.length)]
    let status = statuses[Math.floor(Math.random() * statuses.length)]
    const createdAt = new Date(Date.now() - Math.random() * 10000000000)
    let processedAt =
      status === "completed" || status === "refunded"
        ? new Date(createdAt.getTime() + Math.random() * 86400000) // Within a day
        : null

    // Introduce data quality issues randomly
    const hasIssue = Math.random() < 0.3
    if (hasIssue) {
      const issueType = Math.floor(Math.random() * 5)

      switch (issueType) {
        case 0:
          // Negative amount (invalid for most transactions)
          amount = -amount
          break
        case 1:
          // Invalid payment method
          paymentMethod = "invalid_method"
          break
        case 2:
          // Missing category
          category = ""
          break
        case 3:
          // Inconsistent status and processedAt
          status = "completed"
          processedAt = null
          break
        case 4:
          // Future date
          processedAt = new Date(Date.now() + 86400000) // One day in the future
          break
      }
    }

    transactions.push({
      id: i + 1,
      transactionId: `TRX-${Math.floor(Math.random() * 1000000)}`,
      userId: user.id,
      userName: user.name, // Shared column for lookups
      amount,
      paymentMethod,
      category,
      status,
      createdAt,
      processedAt,
      notes: Math.random() > 0.7 ? `Transaction note ${i}` : null,
    })
  }

  return transactions
}
