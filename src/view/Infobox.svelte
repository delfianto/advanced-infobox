<script lang="ts">
  import { type InfoboxModel, type RenderContext } from "src/view/infobox-state.svelte";
  import { isEditableValue, parseNumberInput } from "src/model/edit";
  import { type FieldValue } from "src/model/values";
  import { type InfoboxField } from "src/model/schema";

  const { model, ctx }: { model: InfoboxModel; ctx: RenderContext } = $props();

  const vm = $derived(model.vm);
  const tagsMarkdown = $derived(
    vm && vm.tags.length > 0 ? vm.tags.map((t) => `#${t}`).join(" ") : "",
  );

  function toggleCollapse(): void {
    model.collapsed = !model.collapsed;
    ctx.persistCollapse(model.collapsed);
  }

  function toggleBool(event: MouseEvent, key: string, current: boolean): void {
    event.stopPropagation();
    ctx.commitField(key, !current);
  }

  function commitNumber(input: HTMLInputElement, key: string, original: number): void {
    const parsed = parseNumberInput(input.value);
    if (parsed === null) input.value = String(original);
    else if (parsed !== original) ctx.commitField(key, parsed);
    ctx.endEdit();
  }

  function onNumberKeydown(event: KeyboardEvent, original: number): void {
    // Keep Live Preview's CM6 editor from treating these as document keystrokes.
    event.stopPropagation();
    const input = event.currentTarget as HTMLInputElement;
    if (event.key === "Enter") {
      event.preventDefault();
      input.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      input.value = String(original);
      input.blur();
    }
  }
</script>

{#snippet md(text: string)}
  <span class="aib-md" {@attach (el: HTMLElement) => ctx.renderMarkdown(text, el)}></span>
{/snippet}

{#snippet fieldValue(value: FieldValue)}
  {#if value.kind === "markdown"}
    {@render md(value.markdown)}
  {:else if value.kind === "number"}
    <span class="aib-number">{value.value.toLocaleString()}</span>
  {:else if value.kind === "boolean"}
    {#if model.booleanStyle === "yes-no"}
      <span class="aib-bool-text">{value.value ? "Yes" : "No"}</span>
    {:else}
      <span class="aib-bool" class:aib-bool-true={value.value}>{value.value ? "✓" : "✗"}</span>
    {/if}
  {:else if value.kind === "date"}
    <span class="aib-date">{ctx.formatDate(value.iso)}</span>
  {:else if value.kind === "list"}
    {#if value.items.length === 1}
      <!-- A lone bullet reads as clutter; render the single item plain. -->
      {@render fieldValue(value.items[0])}
    {:else if model.arrayStyle === "chips"}
      <span class="aib-chips">
        {#each value.items as item, i (i)}
          <span class="aib-chip">{@render fieldValue(item)}</span>
        {/each}
      </span>
    {:else if model.arrayStyle === "list"}
      <ul class="aib-list">
        {#each value.items as item, i (i)}
          <li>{@render fieldValue(item)}</li>
        {/each}
      </ul>
    {:else}
      {#each value.items as item, i (i)}
        {#if i > 0}<span class="aib-sep">, </span>{/if}{@render fieldValue(item)}
      {/each}
    {/if}
  {:else}
    <span class="aib-empty">—</span>
  {/if}
{/snippet}

{#snippet editor(field: InfoboxField)}
  {@const value = field.value}
  {#if value.kind === "boolean"}
    {@const on = value.value}
    <button
      type="button"
      class="aib-edit aib-edit-bool"
      role="switch"
      aria-checked={on}
      aria-label={field.label}
      onclick={(event) => toggleBool(event, field.key, on)}
    >
      {@render fieldValue(value)}
    </button>
  {:else if value.kind === "number"}
    {@const current = value.value}
    <input
      type="number"
      class="aib-edit aib-edit-number"
      value={current}
      aria-label={field.label}
      onfocus={() => ctx.beginEdit()}
      onblur={(event) => commitNumber(event.currentTarget, field.key, current)}
      onkeydown={(event) => onNumberKeydown(event, current)}
    />
  {/if}
{/snippet}

{#if vm}
  <div class="aib-infobox" class:aib-collapsed={model.collapsible && model.collapsed}>
    {#if model.errors.length > 0}
      <div class="aib-warnings">
        {#each model.errors as error, i (i)}
          <div class="aib-warning">{error}</div>
        {/each}
      </div>
    {/if}

    {#if model.collapsible}
      <button
        type="button"
        class="aib-title-btn"
        aria-expanded={!model.collapsed}
        onclick={toggleCollapse}
      >
        <div class="aib-title">
          <span class="aib-chevron" aria-hidden="true">▾</span>
          {vm.title}
        </div>
      </button>
    {:else}
      <div class="aib-title">{vm.title}</div>
    {/if}

    <div class="aib-body">
    {#if vm.subtitle}
      <div class="aib-subtitle">{@render md(vm.subtitle)}</div>
    {/if}

    {#if vm.image}
      {@const src = ctx.resolveImage(vm.image)}
      {#if src}
        <div class="aib-image">
          <img {src} alt={vm.caption ?? vm.title} />
        </div>
      {:else}
        <div class="aib-image-missing">Image not found: {vm.image}</div>
      {/if}
    {/if}

    {#if vm.caption}
      <div class="aib-caption">{@render md(vm.caption)}</div>
    {/if}

    {#if vm.bare}
      <div class="aib-bare">Add properties to this note to populate the infobox.</div>
    {:else}
      {#if vm.sections.length > 0}
        <table class="aib-table">
          <tbody>
            {#each vm.sections as section, si (si)}
              {#if section.label}
                <tr class="aib-section-row">
                  <th class="aib-section" colspan="2" scope="colgroup">{section.label}</th>
                </tr>
              {/if}
              {#each section.fields as field (field.key)}
                <tr>
                  <th class="aib-label" scope="row">{field.label}</th>
                  <td class="aib-value">
                    {#if model.editEnabled && isEditableValue(field.value)}
                      {@render editor(field)}
                    {:else}
                      {@render fieldValue(field.value)}
                    {/if}
                  </td>
                </tr>
              {/each}
            {/each}
          </tbody>
        </table>
      {/if}

      {#if tagsMarkdown}
        <div class="aib-tags">{@render md(tagsMarkdown)}</div>
      {/if}
    {/if}
    </div>
  </div>
{/if}
