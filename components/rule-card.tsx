"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import type { DataQualityRule } from "@/lib/types"

interface RuleCardProps {
  rule: DataQualityRule
  onEdit: (ruleId: string) => void
  onDelete: (ruleId: string) => void
  onToggle: (rule: DataQualityRule) => void
}

export function RuleCard({ rule, onEdit, onDelete, onToggle }: RuleCardProps) {
  return (
    <Card className={`hover:shadow-md transition-shadow ${rule.enabled ? "" : "opacity-60"}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{rule.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Switch
              checked={rule.enabled}
              onCheckedChange={() => onToggle(rule)}
              aria-label={rule.enabled ? "Disable rule" : "Enable rule"}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{rule.tableName}</Badge>
            <Badge variant="outline">{rule.columnName}</Badge>
            <Badge>{rule.ruleType}</Badge>
          </div>

          {rule.description && <div className="text-sm mt-2">{rule.description}</div>}

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => onEdit(rule.id)}>
              Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(rule.id)}>
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
