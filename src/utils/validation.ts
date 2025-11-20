// Comprehensive validation utilities for PrompX

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Email validation
export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!email) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please enter a valid email address');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Password validation
export const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
  } else {
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Username validation
export const validateUsername = (username: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!username) {
    errors.push('Username is required');
  } else {
    if (username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }
    if (username.length > 30) {
      errors.push('Username must be less than 30 characters');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, hyphens, and underscores');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Card number validation
export const validateCardNumber = (cardNumber: string): ValidationResult => {
  const errors: string[] = [];
  const cleanNumber = cardNumber.replace(/\s+/g, '');
  
  if (!cleanNumber) {
    errors.push('Card number is required');
  } else {
    if (!/^\d{13,19}$/.test(cleanNumber)) {
      errors.push('Card number must be 13-19 digits');
    } else {
      // Luhn algorithm validation
      let sum = 0;
      let alternate = false;
      
      for (let i = cleanNumber.length - 1; i >= 0; i--) {
        let n = parseInt(cleanNumber.charAt(i), 10);
        
        if (alternate) {
          n *= 2;
          if (n > 9) {
            n = (n % 10) + 1;
          }
        }
        
        sum += n;
        alternate = !alternate;
      }
      
      if (sum % 10 !== 0) {
        errors.push('Invalid card number');
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Expiry date validation
export const validateExpiryDate = (expiryDate: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!expiryDate) {
    errors.push('Expiry date is required');
  } else {
    const match = expiryDate.match(/^(\d{2})\/(\d{2})$/);
    if (!match) {
      errors.push('Expiry date must be in MM/YY format');
    } else {
      const month = parseInt(match[1], 10);
      const year = parseInt(match[2], 10) + 2000;
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      if (month < 1 || month > 12) {
        errors.push('Invalid month');
      } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
        errors.push('Card has expired');
      } else if (year > currentYear + 20) {
        errors.push('Invalid expiry year');
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// CVV validation
export const validateCVV = (cvv: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!cvv) {
    errors.push('CVV is required');
  } else if (!/^\d{3,4}$/.test(cvv)) {
    errors.push('CVV must be 3 or 4 digits');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generic required field validation
export const validateRequired = (value: string, fieldName: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!value || value.trim().length === 0) {
    errors.push(`${fieldName} is required`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validate all payment form fields
export interface PaymentFormData {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export const validatePaymentForm = (data: PaymentFormData): ValidationResult => {
  const allErrors: string[] = [];
  
  // Validate card details
  const cardNumberResult = validateCardNumber(data.cardNumber);
  const expiryResult = validateExpiryDate(data.expiryDate);
  const cvvResult = validateCVV(data.cvv);
  const cardholderResult = validateRequired(data.cardholderName, 'Cardholder name');
  
  // Validate billing address
  const streetResult = validateRequired(data.billingAddress.street, 'Street address');
  const cityResult = validateRequired(data.billingAddress.city, 'City');
  const stateResult = validateRequired(data.billingAddress.state, 'State');
  const zipResult = validateRequired(data.billingAddress.zipCode, 'ZIP code');
  const countryResult = validateRequired(data.billingAddress.country, 'Country');
  
  // Collect all errors
  allErrors.push(
    ...cardNumberResult.errors,
    ...expiryResult.errors,
    ...cvvResult.errors,
    ...cardholderResult.errors,
    ...streetResult.errors,
    ...cityResult.errors,
    ...stateResult.errors,
    ...zipResult.errors,
    ...countryResult.errors
  );
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
};

// Sanitize input to prevent XSS
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim(); // Remove leading/trailing whitespace
};

// Validate URL
export const validateURL = (url: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!url) {
    errors.push('URL is required');
  } else {
    try {
      new URL(url);
    } catch {
      errors.push('Please enter a valid URL');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validate phone number (basic)
export const validatePhoneNumber = (phone: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!phone) {
    errors.push('Phone number is required');
  } else {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      errors.push('Please enter a valid phone number');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
