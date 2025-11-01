-- CreateTable
CREATE TABLE "districts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'Haryana',
    "population" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_performance" (
    "id" TEXT NOT NULL,
    "district_id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "job_cards_issued" INTEGER,
    "persons_worked" INTEGER,
    "person_days_generated" DOUBLE PRECISION,
    "avg_wage" DOUBLE PRECISION,
    "works_completed" INTEGER,
    "works_ongoing" INTEGER,
    "expenditure" DOUBLE PRECISION,
    "budget_utilization" DOUBLE PRECISION,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_sync_logs" (
    "id" TEXT NOT NULL,
    "sync_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "records_synced" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT,
    "duration" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_analytics" (
    "id" TEXT NOT NULL,
    "district_code" TEXT,
    "page_view" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "session_id" TEXT,
    "language" TEXT DEFAULT 'en',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "districts_code_key" ON "districts"("code");

-- CreateIndex
CREATE INDEX "monthly_performance_district_id_idx" ON "monthly_performance"("district_id");

-- CreateIndex
CREATE INDEX "monthly_performance_month_year_idx" ON "monthly_performance"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_performance_district_id_month_year_key" ON "monthly_performance"("district_id", "month", "year");

-- CreateIndex
CREATE INDEX "user_analytics_district_code_idx" ON "user_analytics"("district_code");

-- CreateIndex
CREATE INDEX "user_analytics_timestamp_idx" ON "user_analytics"("timestamp");

-- AddForeignKey
ALTER TABLE "monthly_performance" ADD CONSTRAINT "monthly_performance_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
