<script lang="ts">
  import { coerceScalar, type Scalar } from "src/model/edit";
  import { type RenderContext } from "src/view/infobox-state.svelte";
  import { tick } from "svelte";

  const {
    fieldKey,
    initial,
    ctx,
  }: { fieldKey: string; initial: string[]; ctx: RenderContext } = $props();

  // Local, editable copy of the item texts. The parent wraps this component in
  // a {#key} on the saved list, so an external change remounts us with fresh
  // values — and the edit latch defers refreshes while an input here is focused,
  // so a remount never lands mid-edit — capturing initial once is intentional.
  // svelte-ignore state_referenced_locally
  const items = $state<string[]>([...initial]);

  // Rebuild the whole array in display order (preserving order) and write it;
  // blank rows are dropped, and each survivor is typed like a bare YAML scalar.
  function commit(): void {
    const values: Scalar[] = [];
    for (const text of items) {
      const scalar = coerceScalar(text);
      if (scalar !== null) values.push(scalar);
    }
    ctx.commitField(fieldKey, values);
  }

  function onItemBlur(index: number, value: string): void {
    items[index] = value;
    commit();
    ctx.endEdit();
  }

  function onItemKeydown(event: KeyboardEvent): void {
    // Keep Live Preview's CM6 editor from treating these as document keystrokes.
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      (event.currentTarget as HTMLInputElement).blur();
    }
  }

  function removeItem(event: MouseEvent, index: number): void {
    event.stopPropagation();
    items.splice(index, 1);
    commit();
  }

  async function addItem(event: MouseEvent): Promise<void> {
    event.stopPropagation();
    const root = (event.currentTarget as HTMLElement).closest(".aib-list-edit");
    items.push("");
    await tick();
    const inputs = [...(root?.querySelectorAll<HTMLInputElement>("input.aib-list-edit-item") ?? [])];
    inputs.at(-1)?.focus();
  }
</script>

<div class="aib-list-edit">
  {#each items as item, i (i)}
    <div class="aib-list-edit-row">
      <input
        type="text"
        class="aib-edit aib-list-edit-item"
        value={item}
        aria-label={`Item ${i + 1}`}
        onfocus={() => ctx.beginEdit()}
        onblur={(event) => onItemBlur(i, event.currentTarget.value)}
        onkeydown={onItemKeydown}
      />
      <button
        type="button"
        class="aib-list-edit-remove"
        aria-label="Remove item"
        onclick={(event) => removeItem(event, i)}
      >
        ×
      </button>
    </div>
  {/each}
  <button type="button" class="aib-list-edit-add" onclick={(event) => void addItem(event)}>
    + Add
  </button>
</div>
