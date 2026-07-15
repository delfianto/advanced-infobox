import { type App, FuzzySuggestModal } from "obsidian";

/** Fuzzy picker over template ids, used by the insert/scaffold commands. */
export class TemplatePickerModal extends FuzzySuggestModal<string> {
  constructor(
    app: App,
    private readonly templateIds: string[],
    private readonly onPick: (id: string) => void,
  ) {
    super(app);
    this.setPlaceholder("Pick an infobox template…");
  }

  getItems(): string[] {
    return this.templateIds;
  }

  getItemText(id: string): string {
    return id;
  }

  onChooseItem(id: string): void {
    this.onPick(id);
  }
}
