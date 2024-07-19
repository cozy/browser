export const AutofillFieldQualifier = {
  password: "password",
  username: "username",
  cardholderName: "cardholderName",
  cardNumber: "cardNumber",
  cardExpirationMonth: "cardExpirationMonth",
  cardExpirationYear: "cardExpirationYear",
  cardExpirationDate: "cardExpirationDate",
  cardCvv: "cardCvv",
  identityTitle: "identityTitle",
  identityFirstName: "identityFirstName",
  identityMiddleName: "identityMiddleName",
  identityLastName: "identityLastName",
  identityFullName: "identityFullName",
  identityAddress1: "identityAddress1",
  identityAddress2: "identityAddress2",
  identityAddress3: "identityAddress3",
  identityCity: "identityCity",
  identityState: "identityState",
  identityPostalCode: "identityPostalCode",
  identityCountry: "identityCountry",
  identityCompany: "identityCompany",
  identityPhone: "identityPhone",
  identityEmail: "identityEmail",
  identityUsername: "identityUsername",
  // Cozy customization
  paperIdentityCardNumber: "paperIdentityCardNumber",
  // Cozy customization end
} as const;

export type AutofillFieldQualifierType =
  (typeof AutofillFieldQualifier)[keyof typeof AutofillFieldQualifier];
