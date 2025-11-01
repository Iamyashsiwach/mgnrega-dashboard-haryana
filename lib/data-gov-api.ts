import axios, { AxiosError } from 'axios';

const API_BASE_URL = process.env.DATA_GOV_API_BASE_URL || 'https://api.data.gov.in';
const API_KEY = process.env.DATA_GOV_API_KEY;

// Log environment variable loading
console.log('[data-gov-api] Environment loaded:', {
  hasApiKey: !!API_KEY,
  apiKeyLength: API_KEY?.length || 0,
  baseUrl: API_BASE_URL,
});

// MGNREGA API resource ID from data.gov.in catalog
// District-wise MGNREGA Data at a Glance
const MGNREGA_RESOURCE_ID = 'ee03643a-ee4c-48c2-ac30-9f2ff26ab722';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
};

/**
 * Exponential backoff delay calculation
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = Math.min(
    config.baseDelay * Math.pow(2, attempt),
    config.maxDelay
  );
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: AxiosError): boolean {
  if (!error.response) {
    // Network errors are retryable
    return true;
  }

  const status = error.response.status;
  // Retry on rate limits, server errors, and service unavailable
  return status === 429 || status >= 500;
}

/**
 * Fetch MGNREGA data with retry logic
 */
export async function fetchMGNREGAData(
  filters: Record<string, any> = {},
  config: Partial<RetryConfig> = {}
): Promise<any> {
  const retryConfig = { ...defaultRetryConfig, ...config };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      // Log API call details (without exposing full API key)
      console.log('[API] Calling:', `${API_BASE_URL}/resource/${MGNREGA_RESOURCE_ID}`);
      console.log('[API] Has API Key:', !!API_KEY, 'Length:', API_KEY?.length || 0);
      console.log('[API] Filters:', JSON.stringify(filters));

      const response = await axios.get(`${API_BASE_URL}/resource/${MGNREGA_RESOURCE_ID}`, {
        params: {
          'api-key': API_KEY,
          format: 'json',
          ...filters,
        },
        timeout: 15000, // 15 seconds timeout
      });

      return response.data;
    } catch (error) {
      lastError = error as Error;
      const axiosError = error as AxiosError;

      console.error(`Attempt ${attempt + 1} failed:`, {
        message: axiosError.message,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
      });

      // Don't retry if it's not a retryable error
      if (!isRetryableError(axiosError)) {
        throw error;
      }

      // Don't retry if we've exhausted our attempts
      if (attempt === retryConfig.maxRetries) {
        throw error;
      }

      // Wait before retrying
      const delay = calculateDelay(attempt, retryConfig);
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Failed to fetch MGNREGA data');
}

/**
 * Convert month number to month name for API
 */
function getMonthNameForAPI(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
}

/**
 * Fetch district-wise MGNREGA data for Haryana
 */
export async function fetchHaryanaDistrictData(
  year?: number,
  month?: number
): Promise<any[]> {
  const filters: Record<string, any> = {
    'filters[state_name]': 'HARYANA',
  };

  if (year) {
    // API uses format like "2025-2026" for financial year
    filters['filters[fin_year]'] = `${year}-${year + 1}`;
  }

  if (month) {
    // API uses month names like "April", "May", etc.
    filters['filters[month]'] = getMonthNameForAPI(month);
  }

  try {
    const data = await fetchMGNREGAData(filters);
    // Map API fields to our expected format
    const records = data.records || [];
    return records.map((record: any) => ({
      district_code: record.district_code,
      district_name: record.district_name,
      state_name: record.state_name,
      month: record.month,
      year: record.fin_year,
      job_cards_issued: parseInt(record.Total_No_of_JobCards_issued) || 0,
      persons_worked: parseInt(record.Total_Individuals_Worked) || 0,
      person_days_generated: parseInt(record.Persondays_of_Central_Liability_so_far) || 0,
      avg_wage: parseFloat(record.Average_Wage_rate_per_day_per_person) || 0,
      works_completed: parseInt(record.Number_of_Completed_Works) || 0,
      works_ongoing: parseInt(record.Number_of_Ongoing_Works) || 0,
      expenditure: parseFloat(record.Total_Exp) || 0,
      budget_utilization: parseFloat(record.Approved_Labour_Budget) > 0 
        ? (parseFloat(record.Total_Exp) / parseFloat(record.Approved_Labour_Budget)) * 100 
        : 0,
    }));
  } catch (error) {
    console.error('Error fetching Haryana district data:', error);
    throw error;
  }
}

/**
 * Fetch specific district data
 */
export async function fetchDistrictData(
  districtCode: string,
  year?: number,
  month?: number
): Promise<any> {
  const filters: Record<string, any> = {
    'filters[state_name]': 'HARYANA',
    'filters[district_code]': districtCode,
  };

  if (year) {
    filters['filters[fin_year]'] = `${year}-${year + 1}`;
  }

  if (month) {
    filters['filters[month]'] = getMonthNameForAPI(month);
  }

  try {
    const data = await fetchMGNREGAData(filters);
    const record = data.records?.[0];
    if (!record) return null;
    
    // Map API fields to our expected format
    return {
      district_code: record.district_code,
      district_name: record.district_name,
      state_name: record.state_name,
      month: record.month,
      year: record.fin_year,
      job_cards_issued: parseInt(record.Total_No_of_JobCards_issued) || 0,
      persons_worked: parseInt(record.Total_Individuals_Worked) || 0,
      person_days_generated: parseInt(record.Persondays_of_Central_Liability_so_far) || 0,
      avg_wage: parseFloat(record.Average_Wage_rate_per_day_per_person) || 0,
      works_completed: parseInt(record.Number_of_Completed_Works) || 0,
      works_ongoing: parseInt(record.Number_of_Ongoing_Works) || 0,
      expenditure: parseFloat(record.Total_Exp) || 0,
      budget_utilization: parseFloat(record.Approved_Labour_Budget) > 0 
        ? (parseFloat(record.Total_Exp) / parseFloat(record.Approved_Labour_Budget)) * 100 
        : 0,
    };
  } catch (error) {
    console.error(`Error fetching data for district ${districtCode}:`, error);
    throw error;
  }
}

/**
 * Health check for the API
 */
export async function checkAPIHealth(): Promise<boolean> {
  try {
    await axios.get(API_BASE_URL, { timeout: 5000 });
    return true;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}

/**
 * Mock data generator for development/testing when API is down
 */
export function generateMockDistrictData(districtCode: string, districtName: string) {
  const currentDate = new Date();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  return {
    district_code: districtCode,
    district_name: districtName,
    state_name: 'HARYANA',
    month: month,
    year: year,
    job_cards_issued: Math.floor(Math.random() * 50000) + 10000,
    persons_worked: Math.floor(Math.random() * 30000) + 5000,
    person_days_generated: Math.floor(Math.random() * 500000) + 100000,
    avg_wage: Math.floor(Math.random() * 100) + 200,
    works_completed: Math.floor(Math.random() * 500) + 100,
    works_ongoing: Math.floor(Math.random() * 300) + 50,
    expenditure: Math.floor(Math.random() * 10000000) + 2000000,
    budget_utilization: Math.floor(Math.random() * 40) + 60,
  };
}

