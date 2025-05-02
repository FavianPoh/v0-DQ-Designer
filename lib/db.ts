import fs from "fs"
import path from "path"
import type { DataQualityRule, ValueList } from "./types"

// Define the data directory path - use a directory that's accessible in development and production
// For Vercel or similar platforms, we'll use localStorage as a fallback
const DATA_DIR = path.join(process.cwd(), ".data")
const RULES_FILE = path.join(DATA_DIR, "rules.json")
const LISTS_FILE = path.join(DATA_DIR, "lists.json")

// Default data to use if files can't be accessed
const DEFAULT_RULES: DataQualityRule[] = []
const DEFAULT_LISTS: ValueList[] = []

// Ensure the data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    console.log(`Created data directory at ${DATA_DIR}`)
  }
} catch (error) {
  console.error(`Error creating data directory: ${error}`)
}

// Initialize files if they don't exist
try {
  if (!fs.existsSync(RULES_FILE)) {
    fs.writeFileSync(RULES_FILE, JSON.stringify(DEFAULT_RULES))
    console.log(`Created rules file at ${RULES_FILE}`)
  }

  if (!fs.existsSync(LISTS_FILE)) {
    fs.writeFileSync(LISTS_FILE, JSON.stringify(DEFAULT_LISTS))
    console.log(`Created lists file at ${LISTS_FILE}`)
  }
} catch (error) {
  console.error(`Error initializing data files: ${error}`)
}

// Log storage location for debugging
console.log(`Data Quality Framework: Storing data in ${DATA_DIR}`)

// Rules CRUD operations with memory fallback
let rulesInMemory = DEFAULT_RULES
let listsInMemory = DEFAULT_LISTS

// Try to load initial data
try {
  if (fs.existsSync(RULES_FILE)) {
    const data = fs.readFileSync(RULES_FILE, "utf8")
    rulesInMemory = JSON.parse(data)
  }

  if (fs.existsSync(LISTS_FILE)) {
    const data = fs.readFileSync(LISTS_FILE, "utf8")
    listsInMemory = JSON.parse(data)
  }
} catch (error) {
  console.error(`Error loading initial data: ${error}`)
}

// Helper function to save data to localStorage
const saveToLocalStorage = (key: string, data: any) => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(key, JSON.stringify(data))
      return true
    } catch (error) {
      console.error(`Error saving to localStorage: ${error}`)
      return false
    }
  }
  return false
}

// Helper function to load data from localStorage
const loadFromLocalStorage = (key: string, defaultValue: any) => {
  if (typeof window !== "undefined") {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : defaultValue
    } catch (error) {
      console.error(`Error loading from localStorage: ${error}`)
      return defaultValue
    }
  }
  return defaultValue
}

export async function getRules(): Promise<DataQualityRule[]> {
  try {
    // First try to load from file system
    if (fs.existsSync(RULES_FILE)) {
      const data = fs.readFileSync(RULES_FILE, "utf8")
      const rules = JSON.parse(data)
      rulesInMemory = rules // Update in-memory cache

      // Also update localStorage for redundancy
      saveToLocalStorage("dataQualityRules", rules)

      return rules
    }

    // If file system fails, try localStorage
    const localStorageRules = loadFromLocalStorage("dataQualityRules", rulesInMemory)
    if (localStorageRules && localStorageRules.length > 0) {
      rulesInMemory = localStorageRules
      return localStorageRules
    }

    return rulesInMemory
  } catch (error) {
    console.error("Error reading rules:", error)

    // Try localStorage as fallback
    const localStorageRules = loadFromLocalStorage("dataQualityRules", rulesInMemory)
    if (localStorageRules && localStorageRules.length > 0) {
      return localStorageRules
    }

    return rulesInMemory
  }
}

export async function saveRules(rules: DataQualityRule[]): Promise<boolean> {
  try {
    // Try to save to file system
    fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2))
    rulesInMemory = rules // Update in-memory cache

    // Also save to localStorage for redundancy
    saveToLocalStorage("dataQualityRules", rules)

    return true
  } catch (error) {
    console.error("Error saving rules to file system:", error)

    // Try localStorage as fallback
    const savedToLocalStorage = saveToLocalStorage("dataQualityRules", rules)
    rulesInMemory = rules // Still update in-memory cache

    return savedToLocalStorage
  }
}

export async function addRule(rule: DataQualityRule): Promise<boolean> {
  try {
    const rules = await getRules()
    rules.push(rule)
    rulesInMemory = rules // Update in-memory cache
    return saveRules(rules)
  } catch (error) {
    console.error("Error adding rule:", error)
    // Still update in-memory cache
    rulesInMemory = [...rulesInMemory, rule]
    // Try localStorage as fallback
    return saveToLocalStorage("dataQualityRules", rulesInMemory)
  }
}

export async function updateRule(updatedRule: DataQualityRule): Promise<boolean> {
  try {
    const rules = await getRules()
    const index = rules.findIndex((rule) => rule.id === updatedRule.id)
    if (index !== -1) {
      rules[index] = updatedRule
      rulesInMemory = rules // Update in-memory cache
      return saveRules(rules)
    }
    return false
  } catch (error) {
    console.error("Error updating rule:", error)
    // Still update in-memory cache
    const index = rulesInMemory.findIndex((rule) => rule.id === updatedRule.id)
    if (index !== -1) {
      rulesInMemory[index] = updatedRule
      // Try localStorage as fallback
      return saveToLocalStorage("dataQualityRules", rulesInMemory)
    }
    return false
  }
}

export async function deleteRule(ruleId: string): Promise<boolean> {
  try {
    const rules = await getRules()
    const filteredRules = rules.filter((rule) => rule.id !== ruleId)
    rulesInMemory = filteredRules // Update in-memory cache
    return saveRules(filteredRules)
  } catch (error) {
    console.error("Error deleting rule:", error)
    // Still update in-memory cache
    rulesInMemory = rulesInMemory.filter((rule) => rule.id !== ruleId)
    // Try localStorage as fallback
    return saveToLocalStorage("dataQualityRules", rulesInMemory)
  }
}

// Lists CRUD operations with memory fallback
export async function getLists(): Promise<ValueList[]> {
  try {
    // First try to load from file system
    if (fs.existsSync(LISTS_FILE)) {
      const data = fs.readFileSync(LISTS_FILE, "utf8")
      const lists = JSON.parse(data)
      listsInMemory = lists // Update in-memory cache

      // Also update localStorage for redundancy
      saveToLocalStorage("dataQualityLists", lists)

      return lists
    }

    // If file system fails, try localStorage
    const localStorageLists = loadFromLocalStorage("dataQualityLists", listsInMemory)
    if (localStorageLists && localStorageLists.length > 0) {
      listsInMemory = localStorageLists
      return localStorageLists
    }

    return listsInMemory
  } catch (error) {
    console.error("Error reading lists:", error)

    // Try localStorage as fallback
    const localStorageLists = loadFromLocalStorage("dataQualityLists", listsInMemory)
    if (localStorageLists && localStorageLists.length > 0) {
      return localStorageLists
    }

    return listsInMemory
  }
}

export async function saveLists(lists: ValueList[]): Promise<boolean> {
  try {
    // Try to save to file system
    fs.writeFileSync(LISTS_FILE, JSON.stringify(lists, null, 2))
    listsInMemory = lists // Update in-memory cache

    // Also save to localStorage for redundancy
    saveToLocalStorage("dataQualityLists", lists)

    return true
  } catch (error) {
    console.error("Error saving lists to file system:", error)

    // Try localStorage as fallback
    const savedToLocalStorage = saveToLocalStorage("dataQualityLists", lists)
    listsInMemory = lists // Still update in-memory cache

    return savedToLocalStorage
  }
}

export async function addList(list: ValueList): Promise<boolean> {
  try {
    const lists = await getLists()
    lists.push(list)
    listsInMemory = lists // Update in-memory cache
    return saveLists(lists)
  } catch (error) {
    console.error("Error adding list:", error)
    // Still update in-memory cache
    listsInMemory = [...listsInMemory, list]
    // Try localStorage as fallback
    return saveToLocalStorage("dataQualityLists", listsInMemory)
  }
}

export async function updateList(updatedList: ValueList): Promise<boolean> {
  try {
    const lists = await getLists()
    const index = lists.findIndex((list) => list.id === updatedList.id)
    if (index !== -1) {
      lists[index] = updatedList
      listsInMemory = lists // Update in-memory cache
      return saveLists(lists)
    }
    return false
  } catch (error) {
    console.error("Error updating list:", error)
    // Still update in-memory cache
    const index = listsInMemory.findIndex((list) => list.id === updatedList.id)
    if (index !== -1) {
      listsInMemory[index] = updatedList
      // Try localStorage as fallback
      return saveToLocalStorage("dataQualityLists", listsInMemory)
    }
    return false
  }
}

export async function deleteList(listId: string): Promise<boolean> {
  try {
    const lists = await getLists()
    const filteredLists = lists.filter((list) => list.id !== listId)
    listsInMemory = filteredLists // Update in-memory cache
    return saveLists(filteredLists)
  } catch (error) {
    console.error("Error deleting list:", error)
    // Still update in-memory cache
    listsInMemory = listsInMemory.filter((list) => list.id !== listId)
    // Try localStorage as fallback
    return saveToLocalStorage("dataQualityLists", listsInMemory)
  }
}

// Backup function
export async function backupData(): Promise<boolean> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupDir = path.join(DATA_DIR, "backups")

    try {
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }
    } catch (error) {
      console.error(`Error creating backup directory: ${error}`)
      return false
    }

    const rulesBackupFile = path.join(backupDir, `rules-${timestamp}.json`)
    const listsBackupFile = path.join(backupDir, `lists-${timestamp}.json`)

    try {
      fs.writeFileSync(rulesBackupFile, JSON.stringify(rulesInMemory, null, 2))
      fs.writeFileSync(listsBackupFile, JSON.stringify(listsInMemory, null, 2))

      // Also backup to localStorage with timestamp
      saveToLocalStorage(`dataQualityRules-backup-${timestamp}`, rulesInMemory)
      saveToLocalStorage(`dataQualityLists-backup-${timestamp}`, listsInMemory)

      return true
    } catch (error) {
      console.error(`Error writing backup files: ${error}`)

      // Try localStorage backup only
      saveToLocalStorage(`dataQualityRules-backup-${timestamp}`, rulesInMemory)
      saveToLocalStorage(`dataQualityLists-backup-${timestamp}`, listsInMemory)

      return true
    }
  } catch (error) {
    console.error("Error creating backup:", error)
    return false
  }
}
