@echo off
echo Создание baseline для существующей базы данных...

cd backend

echo Создание baseline миграции...
call npx prisma migrate resolve --applied "20250704125747_initial_with_max_logs"
call npx prisma migrate resolve --applied "20250710000000_add_payout_table"
call npx prisma migrate resolve --applied "20250711000000_v1_6_payout_enhancements"
call npx prisma migrate resolve --applied "20250711000001_add_admin_log"
call npx prisma migrate resolve --applied "20250711000002_add_folders"
call npx prisma migrate resolve --applied "20250711000003_add_withdrawal_disputes"
call npx prisma migrate resolve --applied "20250712000000_add_sum_to_write_off"
call npx prisma migrate resolve --applied "20250713000000_add_wellbit_keys"
call npx prisma migrate resolve --applied "20250718130000_add_wellbit_banks"
call npx prisma migrate resolve --applied "20250718140000_add_otkritie"
call npx prisma migrate resolve --applied "20250721_add_kkk_operation"
call npx prisma migrate resolve --applied "20250723_add_idea_model"
call npx prisma migrate resolve --applied "20250723000001_add_payout_filters"
call npx prisma migrate resolve --applied "20250723000002_add_admin_role"
call npx prisma migrate resolve --applied "20250723000003_add_missing_user_columns"
call npx prisma migrate resolve --applied "20250723000004_add_merchant_count_rub"
call npx prisma migrate resolve --applied "20250723000005_add_missing_tables"
call npx prisma migrate resolve --applied "20250723000006_add_missing_columns"

echo Проверка состояния миграций...
call npx prisma migrate status

echo Baseline создан!
pause