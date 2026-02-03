// Comprehensive error handling utilities for PromptX

import { toast } from "@/hooks/use-toast";

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Error types
export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  PAYMENT = 'PAYMENT',
  UNKNOWN = 'UNKNOWN'
}

// Create standardized error
export const createError = (
  type: ErrorType,
  message: string,
  details?: any
): AppError => ({
  code: type,
  message,
  details,
  timestamp: new Date()
});

// Handle Supabase errors
export const handleSupabaseError = (error: any): AppError => {
  console.error('Supabase Error:', error);

  // Authentication errors
  if (error.message?.includes('Invalid login credentials')) {
    return createError(
      ErrorType.AUTHENTICATION,
      'Invalid email or password. Please check your credentials and try again.',
      error
    );
  }

  if (error.message?.includes('Email not confirmed')) {
    return createError(
      ErrorType.AUTHENTICATION,
      'Please check your email and click the confirmation link before signing in.',
      error
    );
  }

  if (error.message?.includes('User already registered')) {
    return createError(
      ErrorType.VALIDATION,
      'An account with this email already exists. Please sign in instead.',
      error
    );
  }

  // Network errors
  if (error.message?.includes('Failed to fetch') || error.code === 'NETWORK_ERROR') {
    return createError(
      ErrorType.NETWORK,
      'Network connection failed. Please check your internet connection and try again.',
      error
    );
  }

  // Database errors
  if (error.code?.startsWith('PGRST')) {
    return createError(
      ErrorType.DATABASE,
      'Database operation failed. Please try again later.',
      error
    );
  }

  // Authorization errors
  if (error.message?.includes('JWT') || error.message?.includes('unauthorized')) {
    return createError(
      ErrorType.AUTHORIZATION,
      'Your session has expired. Please sign in again.',
      error
    );
  }

  // Default error
  return createError(
    ErrorType.UNKNOWN,
    error.message || 'An unexpected error occurred. Please try again.',
    error
  );
};

// Handle payment errors
export const handlePaymentError = (error: any): AppError => {
  console.error('Payment Error:', error);

  if (error.code === 'card_declined') {
    return createError(
      ErrorType.PAYMENT,
      'Your card was declined. Please check your card details or try a different payment method.',
      error
    );
  }

  if (error.code === 'insufficient_funds') {
    return createError(
      ErrorType.PAYMENT,
      'Insufficient funds. Please check your account balance or try a different card.',
      error
    );
  }

  if (error.code === 'expired_card') {
    return createError(
      ErrorType.PAYMENT,
      'Your card has expired. Please use a different payment method.',
      error
    );
  }

  if (error.code === 'invalid_cvc') {
    return createError(
      ErrorType.PAYMENT,
      'Invalid security code. Please check your CVV and try again.',
      error
    );
  }

  return createError(
    ErrorType.PAYMENT,
    'Payment processing failed. Please check your payment details and try again.',
    error
  );
};

// Handle API errors
export const handleApiError = (error: any, context?: string): AppError => {
  console.error(`API Error${context ? ` (${context})` : ''}:`, error);

  if (error.status === 401) {
    return createError(
      ErrorType.AUTHORIZATION,
      'Authentication required. Please sign in to continue.',
      error
    );
  }

  if (error.status === 403) {
    return createError(
      ErrorType.AUTHORIZATION,
      'Access denied. You don\'t have permission to perform this action.',
      error
    );
  }

  if (error.status === 404) {
    return createError(
      ErrorType.VALIDATION,
      'The requested resource was not found.',
      error
    );
  }

  if (error.status === 429) {
    return createError(
      ErrorType.NETWORK,
      'Too many requests. Please wait a moment and try again.',
      error
    );
  }

  if (error.status >= 500) {
    return createError(
      ErrorType.NETWORK,
      'Server error. Please try again later.',
      error
    );
  }

  return createError(
    ErrorType.UNKNOWN,
    error.message || 'An unexpected error occurred.',
    error
  );
};

// Show error toast
export const showErrorToast = (error: AppError) => {
  toast({
    title: getErrorTitle(error.code as ErrorType),
    description: error.message,
    variant: "destructive",
  });
};

// Get user-friendly error title
export const getErrorTitle = (errorType: ErrorType): string => {
  switch (errorType) {
    case ErrorType.AUTHENTICATION:
      return 'Authentication Error';
    case ErrorType.AUTHORIZATION:
      return 'Access Denied';
    case ErrorType.VALIDATION:
      return 'Validation Error';
    case ErrorType.NETWORK:
      return 'Connection Error';
    case ErrorType.DATABASE:
      return 'Database Error';
    case ErrorType.PAYMENT:
      return 'Payment Error';
    default:
      return 'Error';
  }
};

// Retry mechanism
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on authentication or validation errors
      if (error.code === ErrorType.AUTHENTICATION ||
        error.code === ErrorType.VALIDATION ||
        error.status === 401 ||
        error.status === 400) {
        throw error;
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError;
};

// Safe async operation wrapper
export const safeAsync = async <T>(
  operation: () => Promise<T>,
  fallback?: T,
  onError?: (error: AppError) => void
): Promise<T | undefined> => {
  try {
    return await operation();
  } catch (error) {
    const appError = handleApiError(error);

    if (onError) {
      onError(appError);
    } else {
      showErrorToast(appError);
    }

    return fallback;
  }
};

// Validate environment
export const validateEnvironment = (): void => {
  const requiredEnvVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];

  const missing = requiredEnvVars.filter(
    varName => !import.meta.env[varName]
  );

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    throw createError(
      ErrorType.UNKNOWN,
      'Application configuration error. Please contact support.',
      { missing }
    );
  }
};

// Log error for debugging
export const logError = (error: AppError, context?: string) => {
  console.group(`🚨 Error${context ? ` - ${context}` : ''}`);
  console.error('Code:', error.code);
  console.error('Message:', error.message);
  console.error('Timestamp:', error.timestamp);
  if (error.details) {
    console.error('Details:', error.details);
  }
  console.groupEnd();
};
