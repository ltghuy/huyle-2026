import type { Locator, Page } from "@playwright/test";

import { DemoControls } from "../components/demo-controls";

export type Personal = { name: string; email: string; country: string };

export class MultiStepFormPage {
  readonly controls: DemoControls;
  readonly fullName: Locator;
  readonly email: Locator;
  readonly country: Locator;
  readonly next: Locator;
  readonly back: Locator;
  readonly errorSummary: Locator;

  constructor(private readonly page: Page) {
    this.controls = new DemoControls(page);
    this.fullName = page.getByLabel("Full name");
    this.email = page.getByLabel("Email", { exact: true });
    this.country = page.getByLabel("Country you live in");
    this.next = page.getByRole("button", { name: "Next", exact: true });
    this.back = page.getByRole("button", { name: "Back", exact: true });
    this.errorSummary = page.getByRole("heading", { name: /problems? on this step/ });
  }

  async goto(step?: string) {
    await this.page.goto(`/react-practices/multi-step-form${step ? `?step=${step}` : ""}`);
    // The email check and submit wait on the server; no latency keeps the test fast.
    await this.controls.setSlider(/^Server latency/, 0);
  }

  /** The current step's heading, e.g. step("Personal details"). */
  step(title: string) {
    return this.page.getByRole("heading", { level: 2, name: new RegExp(title) });
  }

  async fillPersonal(answers: Personal) {
    await this.fullName.fill(answers.name);
    await this.email.fill(answers.email);
    await this.country.selectOption({ label: answers.country });
  }
}
