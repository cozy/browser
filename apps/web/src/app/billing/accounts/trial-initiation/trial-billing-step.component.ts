import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";

import { ApiService } from "@bitwarden/common/abstractions/api.service";
import {
  BillingInformation,
  OrganizationBillingServiceAbstraction as OrganizationBillingService,
  OrganizationInformation,
  PaymentInformation,
  PlanInformation,
} from "@bitwarden/common/billing/abstractions/organization-billing.service";
import { PaymentMethodType, PlanType, ProductTierType } from "@bitwarden/common/billing/enums";
import { PlanResponse } from "@bitwarden/common/billing/models/response/plan.response";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { MessagingService } from "@bitwarden/common/platform/abstractions/messaging.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";

import { BillingSharedModule, PaymentComponent, TaxInfoComponent } from "../../shared";

export type TrialOrganizationType = Exclude<ProductTierType, ProductTierType.Free>;

export interface OrganizationInfo {
  name: string;
  email: string;
  type: TrialOrganizationType;
}

export interface OrganizationCreatedEvent {
  organizationId: string;
  planDescription: string;
}

enum SubscriptionCadence {
  Annual,
  Monthly,
}

export enum SubscriptionProduct {
  PasswordManager,
  SecretsManager,
}

@Component({
  selector: "app-trial-billing-step",
  templateUrl: "trial-billing-step.component.html",
  imports: [BillingSharedModule],
  standalone: true,
})
export class TrialBillingStepComponent implements OnInit {
  @ViewChild(PaymentComponent) paymentComponent: PaymentComponent;
  @ViewChild(TaxInfoComponent) taxInfoComponent: TaxInfoComponent;
  @Input() organizationInfo: OrganizationInfo;
  @Input() subscriptionProduct: SubscriptionProduct = SubscriptionProduct.PasswordManager;
  @Output() steppedBack = new EventEmitter();
  @Output() organizationCreated = new EventEmitter<OrganizationCreatedEvent>();

  loading = true;

  annualCadence = SubscriptionCadence.Annual;
  monthlyCadence = SubscriptionCadence.Monthly;

  formGroup = this.formBuilder.group({
    cadence: [SubscriptionCadence.Annual, Validators.required],
  });
  formPromise: Promise<string>;

  applicablePlans: PlanResponse[];
  annualPlan?: PlanResponse;
  monthlyPlan?: PlanResponse;

  constructor(
    private apiService: ApiService,
    private i18nService: I18nService,
    private formBuilder: FormBuilder,
    private messagingService: MessagingService,
    private organizationBillingService: OrganizationBillingService,
    private platformUtilsService: PlatformUtilsService,
  ) {}

  async ngOnInit(): Promise<void> {
    const plans = await this.apiService.getPlans();
    this.applicablePlans = plans.data.filter(this.isApplicable);
    this.annualPlan = this.findPlanFor(SubscriptionCadence.Annual);
    this.monthlyPlan = this.findPlanFor(SubscriptionCadence.Monthly);
    this.loading = false;
  }

  async submit(): Promise<void> {
    if (!this.taxInfoComponent.taxFormGroup.valid && this.taxInfoComponent?.taxFormGroup.touched) {
      this.taxInfoComponent.taxFormGroup.markAllAsTouched();
      return;
    }

    this.formPromise = this.createOrganization();

    const organizationId = await this.formPromise;
    const planDescription = this.getPlanDescription();

    this.platformUtilsService.showToast(
      "success",
      this.i18nService.t("organizationCreated"),
      this.i18nService.t("organizationReadyToGo"),
    );

    this.organizationCreated.emit({
      organizationId,
      planDescription,
    });

    // TODO: No one actually listening to this?
    this.messagingService.send("organizationCreated", { organizationId });
  }

  protected changedCountry() {
    this.paymentComponent.hideBank = this.taxInfoComponent.taxFormGroup.value.country !== "US";
    if (
      this.paymentComponent.hideBank &&
      this.paymentComponent.method === PaymentMethodType.BankAccount
    ) {
      this.paymentComponent.method = PaymentMethodType.Card;
      this.paymentComponent.changeMethod();
    }
  }

  protected getPriceFor(cadence: SubscriptionCadence): number {
    const plan = this.findPlanFor(cadence);
    return this.subscriptionProduct === SubscriptionProduct.PasswordManager
      ? plan.PasswordManager.basePrice === 0
        ? plan.PasswordManager.seatPrice
        : plan.PasswordManager.basePrice
      : plan.SecretsManager.basePrice === 0
        ? plan.SecretsManager.seatPrice
        : plan.SecretsManager.basePrice;
  }

  protected stepBack() {
    this.steppedBack.emit();
  }

  private async createOrganization(): Promise<string> {
    const planResponse = this.findPlanFor(this.formGroup.value.cadence);
    const paymentMethod = await this.paymentComponent.createPaymentToken();

    const organization: OrganizationInformation = {
      name: this.organizationInfo.name,
      billingEmail: this.organizationInfo.email,
      initiationPath:
        this.subscriptionProduct === SubscriptionProduct.PasswordManager
          ? "Password Manager trial from marketing website"
          : "Secrets Manager trial from marketing website",
    };

    const plan: PlanInformation = {
      type: planResponse.type,
      passwordManagerSeats: 1,
    };

    if (this.subscriptionProduct === SubscriptionProduct.SecretsManager) {
      plan.subscribeToSecretsManager = true;
      plan.isFromSecretsManagerTrial = true;
      plan.secretsManagerSeats = 1;
    }

    const payment: PaymentInformation = {
      paymentMethod,
      billing: this.getBillingInformationFromTaxInfoComponent(),
    };

    const response = await this.organizationBillingService.purchaseSubscription({
      organization,
      plan,
      payment,
    });

    return response.id;
  }

  private productTypeToPlanTypeMap: {
    [productType in TrialOrganizationType]: {
      [cadence in SubscriptionCadence]?: PlanType;
    };
  } = {
    [ProductTierType.Enterprise]: {
      [SubscriptionCadence.Annual]: PlanType.EnterpriseAnnually,
      [SubscriptionCadence.Monthly]: PlanType.EnterpriseMonthly,
    },
    [ProductTierType.Families]: {
      [SubscriptionCadence.Annual]: PlanType.FamiliesAnnually,
      // No monthly option for Families plan
    },
    [ProductTierType.Teams]: {
      [SubscriptionCadence.Annual]: PlanType.TeamsAnnually,
      [SubscriptionCadence.Monthly]: PlanType.TeamsMonthly,
    },
    [ProductTierType.TeamsStarter]: {
      // No annual option for Teams Starter plan
      [SubscriptionCadence.Monthly]: PlanType.TeamsStarter,
    },
  };

  private findPlanFor(cadence: SubscriptionCadence): PlanResponse | null {
    const productType = this.organizationInfo.type;
    const planType = this.productTypeToPlanTypeMap[productType]?.[cadence];
    return planType ? this.applicablePlans.find((plan) => plan.type === planType) : null;
  }

  private getBillingInformationFromTaxInfoComponent(): BillingInformation {
    return {
      postalCode: this.taxInfoComponent.taxFormGroup?.value.postalCode,
      country: this.taxInfoComponent.taxFormGroup?.value.country,
      taxId: this.taxInfoComponent.taxFormGroup?.value.taxId,
      addressLine1: this.taxInfoComponent.taxFormGroup?.value.line1,
      addressLine2: this.taxInfoComponent.taxFormGroup?.value.line2,
      city: this.taxInfoComponent.taxFormGroup?.value.city,
      state: this.taxInfoComponent.taxFormGroup?.value.state,
    };
  }

  private getPlanDescription(): string {
    const plan = this.findPlanFor(this.formGroup.value.cadence);
    const price =
      this.subscriptionProduct === SubscriptionProduct.PasswordManager
        ? plan.PasswordManager.basePrice === 0
          ? plan.PasswordManager.seatPrice
          : plan.PasswordManager.basePrice
        : plan.SecretsManager.basePrice === 0
          ? plan.SecretsManager.seatPrice
          : plan.SecretsManager.basePrice;

    switch (this.formGroup.value.cadence) {
      case SubscriptionCadence.Annual:
        return `${this.i18nService.t("annual")} ($${price}/${this.i18nService.t("yr")})`;
      case SubscriptionCadence.Monthly:
        return `${this.i18nService.t("monthly")} ($${price}/${this.i18nService.t("monthAbbr")})`;
    }
  }

  private isApplicable(plan: PlanResponse): boolean {
    const hasCorrectProductType =
      plan.productTier === ProductTierType.Enterprise ||
      plan.productTier === ProductTierType.Families ||
      plan.productTier === ProductTierType.Teams ||
      plan.productTier === ProductTierType.TeamsStarter;
    const notDisabledOrLegacy = !plan.disabled && !plan.legacyYear;
    return hasCorrectProductType && notDisabledOrLegacy;
  }
}