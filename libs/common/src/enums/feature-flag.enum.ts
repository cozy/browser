/**
 * Feature flags.
 *
 * Flags MUST be short lived and SHALL be removed once enabled.
 */
export enum FeatureFlag {
  BrowserFilelessImport = "browser-fileless-import",
  ItemShare = "item-share",
  FlexibleCollectionsV1 = "flexible-collections-v-1", // v-1 is intentional
  GeneratorToolsModernization = "generator-tools-modernization",
  ShowPaymentMethodWarningBanners = "show-payment-method-warning-banners",
  EnableConsolidatedBilling = "enable-consolidated-billing",
  AC1795_UpdatedSubscriptionStatusSection = "AC-1795_updated-subscription-status-section",
  EnableDeleteProvider = "AC-1218-delete-provider",
  ExtensionRefresh = "extension-refresh",
  RestrictProviderAccess = "restrict-provider-access",
  UseTreeWalkerApiForPageDetailsCollection = "use-tree-walker-api-for-page-details-collection",
  EmailVerification = "email-verification",
  InlineMenuFieldQualification = "inline-menu-field-qualification",
  MemberAccessReport = "ac-2059-member-access-report",
  TwoFactorComponentRefactor = "two-factor-component-refactor",
  EnableTimeThreshold = "PM-5864-dollar-threshold",
  InlineMenuPositioningImprovements = "inline-menu-positioning-improvements",
  GroupsComponentRefactor = "groups-component-refactor",
  ProviderClientVaultPrivacyBanner = "ac-2833-provider-client-vault-privacy-banner",
  VaultBulkManagementAction = "vault-bulk-management-action",
  AC2828_ProviderPortalMembersPage = "AC-2828_provider-portal-members-page",
}

export type AllowedFeatureFlagTypes = boolean | number | string;

// Helper to ensure the value is treated as a boolean.
const FALSE = false as boolean;

/**
 * Default value for feature flags.
 *
 * DO NOT enable previously disabled flags, REMOVE them instead.
 * We support true as a value as we prefer flags to "enable" not "disable".
 */
export const DefaultFeatureFlagValue = {
  [FeatureFlag.BrowserFilelessImport]: FALSE,
  [FeatureFlag.ItemShare]: FALSE,
  [FeatureFlag.FlexibleCollectionsV1]: FALSE,
  [FeatureFlag.GeneratorToolsModernization]: FALSE,
  [FeatureFlag.ShowPaymentMethodWarningBanners]: FALSE,
  [FeatureFlag.EnableConsolidatedBilling]: FALSE,
  [FeatureFlag.AC1795_UpdatedSubscriptionStatusSection]: FALSE,
  [FeatureFlag.EnableDeleteProvider]: FALSE,
  [FeatureFlag.ExtensionRefresh]: FALSE,
  [FeatureFlag.RestrictProviderAccess]: FALSE,
  [FeatureFlag.UseTreeWalkerApiForPageDetailsCollection]: FALSE,
  [FeatureFlag.EmailVerification]: FALSE,
  [FeatureFlag.InlineMenuFieldQualification]: FALSE,
  [FeatureFlag.MemberAccessReport]: FALSE,
  [FeatureFlag.TwoFactorComponentRefactor]: FALSE,
  [FeatureFlag.EnableTimeThreshold]: FALSE,
  // Cozy customization, enable credit card autofill in inline menu
  //*
  [FeatureFlag.InlineMenuPositioningImprovements]: true,
  /*/
  [FeatureFlag.InlineMenuPositioningImprovements]: FALSE,
  //*/
  [FeatureFlag.GroupsComponentRefactor]: FALSE,
  [FeatureFlag.ProviderClientVaultPrivacyBanner]: FALSE,
  [FeatureFlag.VaultBulkManagementAction]: FALSE,
  [FeatureFlag.AC2828_ProviderPortalMembersPage]: FALSE,
} satisfies Record<FeatureFlag, AllowedFeatureFlagTypes>;

export type DefaultFeatureFlagValueType = typeof DefaultFeatureFlagValue;

export type FeatureFlagValueType<Flag extends FeatureFlag> = DefaultFeatureFlagValueType[Flag];
