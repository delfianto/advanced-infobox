<script lang="ts">
  import { type LightboxState } from "src/view/lightbox-state.svelte";

  const { state }: { state: LightboxState } = $props();

  const multi = $derived(state.urls.length > 1);
  const src = $derived(state.urls[state.index]);
  const atStart = $derived(state.index === 0);
  const atEnd = $derived(state.index === state.urls.length - 1);
</script>

<div class="aib-lightbox-body">
  {#if src}
    <img class="aib-lightbox-img" {src} alt="" />
  {:else}
    <div class="aib-lightbox-missing">Image not found</div>
  {/if}

  {#if multi}
    <div class="aib-lightbox-nav">
      <button
        type="button"
        class="aib-lightbox-btn"
        aria-label="First image"
        disabled={atStart}
        onclick={() => state.first()}
      >
        «
      </button>
      <button
        type="button"
        class="aib-lightbox-btn"
        aria-label="Previous image"
        disabled={atStart}
        onclick={() => state.prev()}
      >
        ‹
      </button>
      <span class="aib-lightbox-counter">{state.index + 1} / {state.urls.length}</span>
      <button
        type="button"
        class="aib-lightbox-btn"
        aria-label="Next image"
        disabled={atEnd}
        onclick={() => state.next()}
      >
        ›
      </button>
      <button
        type="button"
        class="aib-lightbox-btn"
        aria-label="Last image"
        disabled={atEnd}
        onclick={() => state.last()}
      >
        »
      </button>
    </div>
  {/if}
</div>
