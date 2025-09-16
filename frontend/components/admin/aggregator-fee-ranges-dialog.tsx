"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, RefreshCw, Edit } from "lucide-react";
import { useAdminAuth } from "@/stores/auth";
import { formatAmount } from "@/lib/utils";
import { toast } from "sonner";

type FeeRange = {
  id: string;
  minAmount: number;
  maxAmount: number;
  feeInPercent: number;
  feeOutPercent: number;
  createdAt: string;
  updatedAt: string;
};

type AggregatorMerchantData = {
  id: string;
  useFlexibleRates: boolean;
  aggregator: {
    id: string;
    name: string;
  };
  merchant: {
    id: string;
    name: string;
  };
  method: {
    id: string;
    name: string;
    code: string;
  };
  defaultFeeIn: number;
  defaultFeeOut: number;
  feeRanges: FeeRange[];
};

interface AggregatorFeeRangesDialogProps {
  aggregatorMerchantId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AggregatorFeeRangesDialog({
  aggregatorMerchantId,
  isOpen,
  onClose,
}: AggregatorFeeRangesDialogProps) {
  const { token: adminToken } = useAdminAuth();
  const [data, setData] = useState<AggregatorMerchantData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingRange, setIsAddingRange] = useState(false);
  const [isEditingBaseFees, setIsEditingBaseFees] = useState(false);
  const [newRange, setNewRange] = useState({
    minAmount: "",
    maxAmount: "",
    feeInPercent: "",
    feeOutPercent: "",
  });
  const [baseFees, setBaseFees] = useState({
    feeIn: "",
    feeOut: "",
  });

  useEffect(() => {
    if (isOpen && aggregatorMerchantId) {
      fetchFeeRanges();
    }
  }, [isOpen, aggregatorMerchantId]);

  const fetchFeeRanges = async () => {
    if (!aggregatorMerchantId) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregator-merchant/${aggregatorMerchantId}/fee-ranges`,
        {
          headers: {
            "x-admin-key": adminToken || "",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch fee ranges");

      const result = await response.json();
      setData(result.data);
    } catch (error) {
      toast.error("Не удалось загрузить промежутки ставок агрегатора");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRange = async () => {
    if (!aggregatorMerchantId || !newRange.minAmount || !newRange.maxAmount) {
      toast.error("Заполните все поля");
      return;
    }

    try {
      setIsAddingRange(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregator-merchant/${aggregatorMerchantId}/fee-ranges`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminToken || "",
          },
          body: JSON.stringify({
            minAmount: parseFloat(newRange.minAmount),
            maxAmount: parseFloat(newRange.maxAmount),
            feeInPercent: parseFloat(newRange.feeInPercent) || 0,
            feeOutPercent: parseFloat(newRange.feeOutPercent) || 0,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to add fee range");

      toast.success("Промежуток ставки добавлен");
      setNewRange({
        minAmount: "",
        maxAmount: "",
        feeInPercent: "",
        feeOutPercent: "",
      });
      fetchFeeRanges();
    } catch (error) {
      toast.error("Не удалось добавить промежуток ставки");
    } finally {
      setIsAddingRange(false);
    }
  };

  const handleDeleteRange = async (rangeId: string) => {
    if (!aggregatorMerchantId) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregator-merchant/${aggregatorMerchantId}/fee-ranges/${rangeId}`,
        {
          method: "DELETE",
          headers: {
            "x-admin-key": adminToken || "",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete fee range");

      toast.success("Промежуток ставки удален");
      fetchFeeRanges();
    } catch (error) {
      toast.error("Не удалось удалить промежуток ставки");
    }
  };

  const handleToggleFlexibleRates = async () => {
    if (!aggregatorMerchantId || !data) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregator-merchant/${aggregatorMerchantId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminToken || "",
          },
          body: JSON.stringify({
            useFlexibleRates: !data.useFlexibleRates,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update flexible rates setting");

      setData({ ...data, useFlexibleRates: !data.useFlexibleRates });
      toast.success(
        `Гибкие ставки ${!data.useFlexibleRates ? "включены" : "отключены"}`
      );
    } catch (error) {
      toast.error("Не удалось изменить настройку гибких ставок");
    }
  };

  const handleSaveBaseFees = async () => {
    if (!aggregatorMerchantId || !data) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregator-merchant/${aggregatorMerchantId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminToken || "",
          },
          body: JSON.stringify({
            feeIn: parseFloat(baseFees.feeIn),
            feeOut: parseFloat(baseFees.feeOut),
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update base fees");

      setData({
        ...data,
        defaultFeeIn: parseFloat(baseFees.feeIn),
        defaultFeeOut: parseFloat(baseFees.feeOut),
      });

      setIsEditingBaseFees(false);
      toast.success("Базовые ставки обновлены");
    } catch (error) {
      toast.error("Не удалось обновить базовые ставки");
    }
  };

  const handleStartEditingBaseFees = () => {
    if (data) {
      setBaseFees({
        feeIn: data.defaultFeeIn.toString(),
        feeOut: data.defaultFeeOut.toString(),
      });
      setIsEditingBaseFees(true);
    }
  };

  const handleCancelEditingBaseFees = () => {
    setIsEditingBaseFees(false);
    setBaseFees({ feeIn: "", feeOut: "" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Настройка промежутков процентных ставок агрегатора</DialogTitle>
          <DialogDescription>
            {data && (
              <>
                Агрегатор: {data.aggregator?.name || 'Неизвестно'} • Мерчант: {data.merchant?.name || 'Неизвестно'} •
                Метод: {data.method?.name || 'Неизвестно'}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Default rates info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-blue-900">Базовые ставки</h4>
                {!isEditingBaseFees && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartEditingBaseFees}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Редактировать
                  </Button>
                )}
              </div>
              
              {isEditingBaseFees ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">
                        Комиссия вход (%)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={baseFees.feeIn}
                        onChange={(e) =>
                          setBaseFees({ ...baseFees, feeIn: e.target.value })
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">
                        Комиссия выход (%)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={baseFees.feeOut}
                        onChange={(e) =>
                          setBaseFees({ ...baseFees, feeOut: e.target.value })
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveBaseFees}
                      disabled={!baseFees.feeIn || !baseFees.feeOut}
                    >
                      Сохранить
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEditingBaseFees}
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Комиссия вход:</span>{" "}
                      {data.defaultFeeIn}%
                    </div>
                    <div>
                      <span className="text-blue-700">Комиссия выход:</span>{" "}
                      {data.defaultFeeOut}%
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Эти ставки применяются для сумм, не попадающих в настроенные
                    промежутки
                  </p>
                </>
              )}
            </div>

            {/* Flexible rates toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Гибкие ставки</h4>
                <p className="text-sm text-gray-600">
                  Использовать промежутки ставок вместо фиксированных значений
                </p>
              </div>
              <Button
                variant={data.useFlexibleRates ? "default" : "outline"}
                onClick={handleToggleFlexibleRates}
              >
                {data.useFlexibleRates ? "Включены" : "Отключены"}
              </Button>
            </div>

            {/* Fee ranges table */}
            <div>
              <h4 className="font-medium mb-4">
                Промежутки ставок ({data.feeRanges.length})
              </h4>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Сумма от (₽)</TableHead>
                    <TableHead>Сумма до (₽)</TableHead>
                    <TableHead>Ставка IN (%)</TableHead>
                    <TableHead>Ставка OUT (%)</TableHead>
                    <TableHead className="w-[100px]">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.feeRanges.map((range) => (
                    <TableRow key={range.id}>
                      <TableCell>{formatAmount(range.minAmount)}</TableCell>
                      <TableCell>{formatAmount(range.maxAmount)}</TableCell>
                      <TableCell>{range.feeInPercent}%</TableCell>
                      <TableCell>{range.feeOutPercent}%</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRange(range.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.feeRanges.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        Нет настроенных промежутков ставок
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Add new range form */}
            <div className="border-t pt-6">
              <h4 className="font-medium mb-4">Добавить новый промежуток</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minAmount">Сумма от (₽)</Label>
                  <Input
                    id="minAmount"
                    type="number"
                    step="0.01"
                    value={newRange.minAmount}
                    onChange={(e) =>
                      setNewRange({ ...newRange, minAmount: e.target.value })
                    }
                    placeholder="1000"
                  />
                </div>
                <div>
                  <Label htmlFor="maxAmount">Сумма до (₽)</Label>
                  <Input
                    id="maxAmount"
                    type="number"
                    step="0.01"
                    value={newRange.maxAmount}
                    onChange={(e) =>
                      setNewRange({ ...newRange, maxAmount: e.target.value })
                    }
                    placeholder="10000"
                  />
                </div>
                <div>
                  <Label htmlFor="feeInPercent">Ставка IN (%)</Label>
                  <Input
                    id="feeInPercent"
                    type="number"
                    step="0.01"
                    value={newRange.feeInPercent}
                    onChange={(e) =>
                      setNewRange({ ...newRange, feeInPercent: e.target.value })
                    }
                    placeholder="2.5"
                  />
                </div>
                <div>
                  <Label htmlFor="feeOutPercent">Ставка OUT (%)</Label>
                  <Input
                    id="feeOutPercent"
                    type="number"
                    step="0.01"
                    value={newRange.feeOutPercent}
                    onChange={(e) =>
                      setNewRange({ ...newRange, feeOutPercent: e.target.value })
                    }
                    placeholder="3.0"
                  />
                </div>
              </div>
              <Button
                onClick={handleAddRange}
                disabled={isAddingRange}
                className="mt-4"
              >
                {isAddingRange ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Добавить промежуток
              </Button>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
