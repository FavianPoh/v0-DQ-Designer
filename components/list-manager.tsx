"use client"

import type React from "react"

import { useState } from "react"
import { PlusCircle, Pencil, Trash2, X, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import type { ValueList } from "@/lib/types"

interface ListManagerProps {
  lists: ValueList[]
  onAddList: (list: ValueList) => void
  onUpdateList: (list: ValueList) => void
  onDeleteList: (listId: string) => void
  isSaving?: boolean
}

export function ListManager({ lists, onAddList, onUpdateList, onDeleteList, isSaving = false }: ListManagerProps) {
  const [isAddingList, setIsAddingList] = useState(false)
  const [editingListId, setEditingListId] = useState<string | null>(null)
  const [newList, setNewList] = useState<ValueList>({
    id: "",
    name: "",
    description: "",
    values: [],
  })
  const [newValue, setNewValue] = useState("")

  const handleAddList = () => {
    const listToAdd = {
      ...newList,
      id: crypto.randomUUID(),
    }
    onAddList(listToAdd)
    setIsAddingList(false)
    setNewList({
      id: "",
      name: "",
      description: "",
      values: [],
    })
  }

  const handleUpdateList = () => {
    onUpdateList(newList)
    setEditingListId(null)
    setNewList({
      id: "",
      name: "",
      description: "",
      values: [],
    })
  }

  const handleCancelEdit = () => {
    setIsAddingList(false)
    setEditingListId(null)
    setNewList({
      id: "",
      name: "",
      description: "",
      values: [],
    })
  }

  const handleEditList = (list: ValueList) => {
    setEditingListId(list.id)
    setNewList({ ...list })
  }

  const handleAddValue = () => {
    if (newValue.trim() && !newList.values.includes(newValue.trim())) {
      setNewList({
        ...newList,
        values: [...newList.values, newValue.trim()],
      })
      setNewValue("")
    }
  }

  const handleRemoveValue = (value: string) => {
    setNewList({
      ...newList,
      values: newList.values.filter((v) => v !== value),
    })
  }

  const handleBulkAddValues = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const values = e.target.value
      .split("\n")
      .map((v) => v.trim())
      .filter((v) => v.length > 0)

    // Remove duplicates
    const uniqueValues = [...new Set(values)]

    setNewList({
      ...newList,
      values: uniqueValues,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Value Lists</h2>
        {!isAddingList && !editingListId && (
          <Button onClick={() => setIsAddingList(true)} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Add List
          </Button>
        )}
      </div>

      {(isAddingList || editingListId) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingListId ? "Edit List" : "Add New List"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">List Name</Label>
                  <Input
                    id="name"
                    value={newList.name}
                    onChange={(e) => setNewList({ ...newList, name: e.target.value })}
                    placeholder="e.g., Valid Currencies"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newList.description}
                    onChange={(e) => setNewList({ ...newList, description: e.target.value })}
                    placeholder="e.g., List of supported currency codes"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Values</Label>
                <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[100px]">
                  {newList.values.map((value) => (
                    <Badge key={value} variant="secondary" className="flex items-center gap-1">
                      {value}
                      <button
                        type="button"
                        onClick={() => handleRemoveValue(value)}
                        className="ml-1 rounded-full hover:bg-gray-200 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {newList.values.length === 0 && <div className="text-gray-400 text-sm">No values added yet</div>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newValue">Add Value</Label>
                <div className="flex gap-2">
                  <Input
                    id="newValue"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="e.g., USD"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddValue()
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddValue}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulkValues">Bulk Add Values (one per line)</Label>
                <Textarea
                  id="bulkValues"
                  placeholder="USD&#10;EUR&#10;GBP&#10;JPY"
                  rows={5}
                  onChange={handleBulkAddValues}
                />
                <p className="text-xs text-gray-500">
                  Enter multiple values, one per line. Duplicates will be automatically removed.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={editingListId ? handleUpdateList : handleAddList}
                  disabled={isSaving || !newList.name || newList.values.length === 0}
                >
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editingListId ? "Update List" : "Add List"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {lists.map((list) => (
          <Card key={list.id} className={editingListId === list.id ? "border-blue-500" : ""}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{list.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{list.description}</p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEditList(list)} disabled={isSaving}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDeleteList(list.id)} disabled={isSaving}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {list.values.map((value) => (
                  <Badge key={value} variant="secondary">
                    {value}
                  </Badge>
                ))}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {list.values.length} {list.values.length === 1 ? "value" : "values"}
              </div>
            </CardContent>
          </Card>
        ))}

        {lists.length === 0 && !isAddingList && (
          <div className="col-span-2 text-center py-8 border rounded-md bg-gray-50 dark:bg-gray-800">
            <p className="text-gray-500 dark:text-gray-400">
              No value lists defined yet. Click "Add List" to create your first list.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
