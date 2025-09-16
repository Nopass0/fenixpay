"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, Info, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

interface Transaction {
  id: string;
  numericId: number;
  amount: number;
  amountUsdt: number;
  amountWithFee: number;
  amountUsdtWithFee: number;
  rate: number | null;
  status: string;
  assetOrBank: string | null;
  clientName: string | null;
  aggregatorOrderId: string | null;
  partnerDealId: string | null;
  createdAt: string;
  updatedAt: string;
  merchant: {
    id: string;
    name: string;
  } | null;
  trader: {
    id: string;
    name: string;
  } | null;
  method: {
    id: string;
    commissionPayin: number;
  } | null;
  type: string;
  expired_at: string;
  feeInfo: {
    type: string;
    feePercent: number;
    usedDefault: boolean;
    appliedRange: {
      id: string;
      minAmount: number;
      maxAmount: number;
    } | null;
  } | null;
}

interface AggregatorTransactionsProps {
  aggregatorId: string;
}

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const statusColors: Record<string, string> = {
  CREATED: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  READY: "bg-green-100 text-green-700",
  CANCELED: "bg-red-100 text-red-700",
  EXPIRED: "bg-orange-100 text-orange-700",
  DISPUTE: "bg-purple-100 text-purple-700",
  MILK: "bg-pink-100 text-pink-700",
};

const statusLabels: Record<string, string> = {
  CREATED: "Создана",
  IN_PROGRESS: "В процессе",
  READY: "Готова",
  CANCELED: "Отменена",
  EXPIRED: "Истекла",
  DISPUTE: "Спор",
  MILK: "Ошибка",
};

export default function AggregatorTransactions({
  aggregatorId,
}: AggregatorTransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchTransactions = async () => {
    try {
      const adminKey = localStorage.getItem("adminKey");
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      
      if (search) {
        params.append("search", search);
      }
      
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/aggregators-v2/${aggregatorId}/transactions?${params.toString()}`,
        {
          headers: {
            "x-admin-key": adminKey || "",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }
      
      const data = await response.json();
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Ошибка при загрузке транзакций");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [aggregatorId, search, statusFilter, limit, offset]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setOffset(0); // Reset to first page
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setOffset(0); // Reset to first page
  };

  const handlePreviousPage = () => {
    setOffset(Math.max(0, offset - limit));
  };

  const handleNextPage = () => {
    if (offset + limit < total) {
      setOffset(offset + limit);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            Загрузка транзакций...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Транзакции агрегатора</CardTitle>
        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск по ID, Order ID..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="CREATED">Создана</SelectItem>
              <SelectItem value="IN_PROGRESS">В процессе</SelectItem>
              <SelectItem value="READY">Готова</SelectItem>
              <SelectItem value="CANCELED">Отменена</SelectItem>
              <SelectItem value="EXPIRED">Истекла</SelectItem>
              <SelectItem value="DISPUTE">Спор</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length > 0 ? (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Partner Deal ID</TableHead>
                    <TableHead>Сумма (RUB)</TableHead>
                    <TableHead>Сумма (USDT)</TableHead>
                    <TableHead>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center gap-1">
                            Сумма со ставкой
                            <Info className="h-3 w-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Сумма с учетом ставки агрегатора или трейдера</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead>Курс</TableHead>
                    <TableHead>Ставка</TableHead>
                    <TableHead>Мерчант</TableHead>
                    <TableHead>Трейдер</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Дата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => {
                    const feePercent = transaction.feeInfo?.feePercent || 0;
                    const feeType = transaction.feeInfo?.type || "none";
                    const isFlexible = transaction.feeInfo?.appliedRange !== null;
                    const feeChange = transaction.amountUsdtWithFee - transaction.amountUsdt;
                    const feeChangePercent = transaction.amountUsdt > 0 
                      ? ((feeChange / transaction.amountUsdt) * 100).toFixed(2)
                      : "0";
                    
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono">
                          #{transaction.numericId}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {transaction.partnerDealId || transaction.aggregatorOrderId || "—"}
                        </TableCell>
                        <TableCell>
                          {formatAmount(transaction.amount)} ₽
                        </TableCell>
                        <TableCell>
                          {transaction.amountUsdt > 0 
                            ? `${formatAmount(transaction.amountUsdt)} USDT` 
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <span className="font-medium">
                                {formatAmount(transaction.amountWithFee)} ₽
                              </span>
                              {feeChange > 0 && (
                                <TrendingUp className="h-3 w-3 text-green-500" />
                              )}
                              {feeChange < 0 && (
                                <TrendingDown className="h-3 w-3 text-red-500" />
                              )}
                            </div>
                            {transaction.amountUsdtWithFee > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {formatAmount(transaction.amountUsdtWithFee)} USDT
                                {feeChange !== 0 && (
                                  <span className={feeChange > 0 ? "text-green-600 ml-1" : "text-red-600 ml-1"}>
                                    ({feeChange > 0 ? "+" : ""}{feeChangePercent}%)
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {transaction.rate 
                            ? `${transaction.rate.toFixed(2)} ₽/USDT` 
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {transaction.feeInfo ? (
                            <div className="flex flex-col gap-1">
                              <Badge 
                                variant={isFlexible ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {feePercent}%
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {feeType === "aggregator" ? "Агрегатор" : "Трейдер"}
                                {isFlexible && " (гибкая)"}
                              </span>
                              {isFlexible && transaction.feeInfo.appliedRange && (
                                <span className="text-xs text-muted-foreground">
                                  {formatAmount(transaction.feeInfo.appliedRange.minAmount)}-
                                  {formatAmount(transaction.feeInfo.appliedRange.maxAmount)} ₽
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {transaction.merchant?.name || "—"}
                        </TableCell>
                        <TableCell>
                          {transaction.trader?.name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={statusColors[transaction.status] || ""}
                          >
                            {statusLabels[transaction.status] || transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(transaction.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Показано {Math.min(offset + limit, total)} из {total} транзакций
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={offset === 0}
                >
                  Предыдущая
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={offset + limit >= total}
                >
                  Следующая
                </Button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Нет транзакций
          </p>
        )}
      </CardContent>
    </Card>
  );
}