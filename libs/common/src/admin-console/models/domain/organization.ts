import { Jsonify } from "type-fest";

import { ProductType } from "../../../enums";
import { OrganizationUserStatusType, OrganizationUserType, ProviderType } from "../../enums";
import { PermissionsApi } from "../api/permissions.api";
import { OrganizationData } from "../data/organization.data";

export class Organization {
  id: string;
  name: string;
  status: OrganizationUserStatusType;

  /**
   * The member's role in the organization.
   * Avoid using this for permission checks - use the getters instead (e.g. isOwner, isAdmin, canManageX), because they
   * properly handle permission inheritance and relationships.
   */
  type: OrganizationUserType;

  enabled: boolean;
  usePolicies: boolean;
  useGroups: boolean;
  useDirectory: boolean;
  useEvents: boolean;
  useTotp: boolean;
  use2fa: boolean;
  useApi: boolean;
  useSso: boolean;
  useKeyConnector: boolean;
  useScim: boolean;
  useCustomPermissions: boolean;
  useResetPassword: boolean;
  useSecretsManager: boolean;
  usePasswordManager: boolean;
  useActivateAutofillPolicy: boolean;
  selfHost: boolean;
  usersGetPremium: boolean;
  seats: number;
  maxCollections: number;
  maxStorageGb?: number;
  ssoBound: boolean;
  identifier: string;
  permissions: PermissionsApi;
  resetPasswordEnrolled: boolean;
  userId: string;
  hasPublicAndPrivateKeys: boolean;
  providerId: string;
  providerName: string;
  providerType?: ProviderType;
  /**
   * Indicates that a user is a ProviderUser for the organization
   */
  isProviderUser: boolean;
  /**
   * Indicates that a user is a member for the organization (may be `false` if they have access via a Provider only)
   */
  isMember: boolean;
  familySponsorshipFriendlyName: string;
  familySponsorshipAvailable: boolean;
  planProductType: ProductType;
  keyConnectorEnabled: boolean;
  keyConnectorUrl: string;
  familySponsorshipLastSyncDate?: Date;
  familySponsorshipValidUntil?: Date;
  familySponsorshipToDelete?: boolean;
  accessSecretsManager: boolean;
  /**
   * Refers to the ability for an organization to limit collection creation and deletion to owners and admins only
   */
  limitCollectionCreationDeletion: boolean;
  /**
   * Refers to the ability for an owner/admin to access all collection items, regardless of assigned collections
   */
  allowAdminAccessToAllCollectionItems: boolean;
  /**
   * Returns true if this organization has enabled Flexible Collections (MVP) and their data has been migrated.
   * Generally, you should use this as the feature flag to gate Flexible Collections features.
   */
  flexibleCollections: boolean;

  constructor(obj?: OrganizationData) {
    if (obj == null) {
      return;
    }

    this.id = obj.id;
    this.name = obj.name;
    this.status = obj.status;
    this.type = obj.type;
    this.enabled = obj.enabled;
    this.usePolicies = obj.usePolicies;
    this.useGroups = obj.useGroups;
    this.useDirectory = obj.useDirectory;
    this.useEvents = obj.useEvents;
    this.useTotp = obj.useTotp;
    this.use2fa = obj.use2fa;
    this.useApi = obj.useApi;
    this.useSso = obj.useSso;
    this.useKeyConnector = obj.useKeyConnector;
    this.useScim = obj.useScim;
    this.useCustomPermissions = obj.useCustomPermissions;
    this.useResetPassword = obj.useResetPassword;
    this.useSecretsManager = obj.useSecretsManager;
    this.usePasswordManager = obj.usePasswordManager;
    this.useActivateAutofillPolicy = obj.useActivateAutofillPolicy;
    this.selfHost = obj.selfHost;
    this.usersGetPremium = obj.usersGetPremium;
    this.seats = obj.seats;
    this.maxCollections = obj.maxCollections;
    this.maxStorageGb = obj.maxStorageGb;
    this.ssoBound = obj.ssoBound;
    this.identifier = obj.identifier;
    this.permissions = obj.permissions;
    this.resetPasswordEnrolled = obj.resetPasswordEnrolled;
    this.userId = obj.userId;
    this.hasPublicAndPrivateKeys = obj.hasPublicAndPrivateKeys;
    this.providerId = obj.providerId;
    this.providerName = obj.providerName;
    this.providerType = obj.providerType;
    this.isProviderUser = obj.isProviderUser;
    this.isMember = obj.isMember;
    this.familySponsorshipFriendlyName = obj.familySponsorshipFriendlyName;
    this.familySponsorshipAvailable = obj.familySponsorshipAvailable;
    this.planProductType = obj.planProductType;
    this.keyConnectorEnabled = obj.keyConnectorEnabled;
    this.keyConnectorUrl = obj.keyConnectorUrl;
    this.familySponsorshipLastSyncDate = obj.familySponsorshipLastSyncDate;
    this.familySponsorshipValidUntil = obj.familySponsorshipValidUntil;
    this.familySponsorshipToDelete = obj.familySponsorshipToDelete;
    this.accessSecretsManager = obj.accessSecretsManager;
    this.limitCollectionCreationDeletion = obj.limitCollectionCreationDeletion;
    this.allowAdminAccessToAllCollectionItems = obj.allowAdminAccessToAllCollectionItems;
    this.flexibleCollections = obj.flexibleCollections;
  }

  get canAccess() {
    if (this.isOwner) {
      return true;
    }
    return this.enabled && this.status === OrganizationUserStatusType.Confirmed;
  }

  /**
   * Whether a user has Manager permissions or greater
   *
   * @deprecated
   * This is deprecated with the introduction of Flexible Collections.
   */
  get isManager() {
    return this.type === OrganizationUserType.Manager || this.isAdmin;
  }

  /**
   * Whether a user has Admin permissions or greater
   */
  get isAdmin() {
    return this.type === OrganizationUserType.Admin || this.isOwner;
  }

  /**
   * Whether a user has Owner permissions (including ProviderUsers)
   */
  get isOwner() {
    return this.type === OrganizationUserType.Owner || this.isProviderUser;
  }

  get canAccessEventLogs() {
    return (this.isAdmin || this.permissions.accessEventLogs) && this.useEvents;
  }

  get canAccessImportExport() {
    return this.isAdmin || this.permissions.accessImportExport;
  }

  get canAccessReports() {
    return this.isAdmin || this.permissions.accessReports;
  }

  get canCreateNewCollections() {
    if (this.flexibleCollections) {
      return (
        !this.limitCollectionCreationDeletion ||
        this.isAdmin ||
        this.permissions.createNewCollections
      );
    }

    return this.isManager || this.permissions.createNewCollections;
  }

  canEditAnyCollection(flexibleCollectionsV1Enabled: boolean) {
    if (!this.flexibleCollections || !flexibleCollectionsV1Enabled) {
      // Pre-Flexible Collections v1 logic
      return this.isAdmin || this.permissions.editAnyCollection;
    }

    // Post Flexible Collections V1, the allowAdminAccessToAllCollectionItems flag can restrict admins
    // Providers and custom users with canEditAnyCollection are not affected by allowAdminAccessToAllCollectionItems flag
    return (
      this.isProviderUser ||
      (this.type === OrganizationUserType.Custom && this.permissions.editAnyCollection) ||
      (this.allowAdminAccessToAllCollectionItems && this.isAdmin)
    );
  }

  canEditUnmanagedCollections() {
    // Any admin or custom user with editAnyCollection permission can edit unmanaged collections
    return this.isAdmin || this.permissions.editAnyCollection;
  }

  canEditUnassignedCiphers(restrictProviderAccessFlagEnabled: boolean) {
    if (this.isProviderUser) {
      return !restrictProviderAccessFlagEnabled;
    }
    return this.isAdmin || this.permissions.editAnyCollection;
  }

  canEditAllCiphers(
    flexibleCollectionsV1Enabled: boolean,
    restrictProviderAccessFlagEnabled: boolean,
  ) {
    // Before Flexible Collections, any admin or anyone with editAnyCollection permission could edit all ciphers
    if (!this.flexibleCollections || !flexibleCollectionsV1Enabled || !this.flexibleCollections) {
      return this.isAdmin || this.permissions.editAnyCollection;
    }

    if (this.isProviderUser) {
      return !restrictProviderAccessFlagEnabled;
    }

    // Post Flexible Collections V1, the allowAdminAccessToAllCollectionItems flag can restrict admins
    // Custom users with canEditAnyCollection are not affected by allowAdminAccessToAllCollectionItems flag
    return (
      (this.type === OrganizationUserType.Custom && this.permissions.editAnyCollection) ||
      (this.allowAdminAccessToAllCollectionItems &&
        (this.type === OrganizationUserType.Admin || this.type === OrganizationUserType.Owner))
    );
  }

  /**
   * @param flexibleCollectionsV1Enabled - Whether or not the V1 Flexible Collection feature flag is enabled
   * @returns True if the user can delete any collection
   */
  canDeleteAnyCollection(flexibleCollectionsV1Enabled: boolean) {
    // Providers and Users with DeleteAnyCollection permission can always delete collections
    if (this.isProviderUser || this.permissions.deleteAnyCollection) {
      return true;
    }

    // If AllowAdminAccessToAllCollectionItems is true, Owners and Admins can delete any collection, regardless of LimitCollectionCreationDeletion setting
    // Using explicit type checks because provider users are handled above and this mimics the server's permission checks closely
    if (!flexibleCollectionsV1Enabled || this.allowAdminAccessToAllCollectionItems) {
      return this.type == OrganizationUserType.Owner || this.type == OrganizationUserType.Admin;
    }

    return false;
  }

  /**
   * Whether the user can view all collection information, such as collection name and access.
   * This does not indicate that the user can view items inside any collection - for that, see {@link canEditAllCiphers}
   */
  get canViewAllCollections() {
    // Admins can always see all collections even if collection management settings prevent them from editing them or seeing items
    return (
      this.isAdmin || this.permissions.editAnyCollection || this.permissions.deleteAnyCollection
    );
  }

  /**
   * @deprecated
   * This is deprecated with the introduction of Flexible Collections.
   * This will always return false if FlexibleCollections flag is on.
   */
  get canEditAssignedCollections() {
    return this.isManager || this.permissions.editAssignedCollections;
  }

  /**
   * @deprecated
   * This is deprecated with the introduction of Flexible Collections.
   * This will always return false if FlexibleCollections flag is on.
   */
  get canDeleteAssignedCollections() {
    return this.isManager || this.permissions.deleteAssignedCollections;
  }

  /**
   * @deprecated
   * This is deprecated with the introduction of Flexible Collections.
   * This will always return false if FlexibleCollections flag is on.
   */
  get canViewAssignedCollections() {
    return this.canDeleteAssignedCollections || this.canEditAssignedCollections;
  }

  get canManageGroups() {
    return (this.isAdmin || this.permissions.manageGroups) && this.useGroups;
  }

  get canManageSso() {
    return (this.isAdmin || this.permissions.manageSso) && this.useSso;
  }

  get canManageDomainVerification() {
    return (this.isAdmin || this.permissions.manageSso) && this.useSso;
  }

  get canManageScim() {
    return (this.isAdmin || this.permissions.manageScim) && this.useScim;
  }

  get canManagePolicies() {
    return (this.isAdmin || this.permissions.managePolicies) && this.usePolicies;
  }

  get canManageUsers() {
    return this.isAdmin || this.permissions.manageUsers;
  }

  get canManageUsersPassword() {
    return this.isAdmin || this.permissions.manageResetPassword;
  }

  get canManageDeviceApprovals() {
    return (this.isAdmin || this.permissions.manageResetPassword) && this.useSso;
  }

  get isExemptFromPolicies() {
    return this.canManagePolicies;
  }

  get canViewSubscription() {
    if (this.canEditSubscription) {
      return true;
    }

    return this.hasProvider && this.providerType === ProviderType.Msp
      ? this.isProviderUser
      : this.isOwner;
  }

  get canEditSubscription() {
    return this.hasProvider ? this.isProviderUser : this.isOwner;
  }

  get canEditPaymentMethods() {
    return this.canEditSubscription;
  }

  get canViewBillingHistory() {
    return this.canEditSubscription;
  }

  get hasProvider() {
    return this.providerId != null || this.providerName != null;
  }

  get hasReseller() {
    return this.hasProvider && this.providerType === ProviderType.Reseller;
  }

  get canAccessSecretsManager() {
    return this.useSecretsManager && this.accessSecretsManager;
  }

  get isFreeOrg() {
    // return true if organization needs to be upgraded from a free org
    return !this.useTotp;
  }

  get canManageSponsorships() {
    return this.familySponsorshipAvailable || this.familySponsorshipFriendlyName !== null;
  }

  static fromJSON(json: Jsonify<Organization>) {
    if (json == null) {
      return null;
    }

    return Object.assign(new Organization(), json, {
      familySponsorshipLastSyncDate: new Date(json.familySponsorshipLastSyncDate),
      familySponsorshipValidUntil: new Date(json.familySponsorshipValidUntil),
    });
  }
}
