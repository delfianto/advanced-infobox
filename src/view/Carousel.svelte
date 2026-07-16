<script lang="ts">
  import { type RenderContext } from "src/view/infobox-state.svelte";

  const { images, alt, ctx }: { images: string[]; alt: string; ctx: RenderContext } = $props();

  let index = $state(0);

  const multi = $derived(images.length > 1);
  const src = $derived(ctx.resolveImage(images[index]));

  function prev(): void {
    if (index > 0) index--;
  }

  function next(): void {
    if (index < images.length - 1) index++;
  }
</script>

<div class="aib-image" class:aib-carousel={multi}>
  {#if multi}
    <button
      type="button"
      class="aib-carousel-nav aib-carousel-prev"
      aria-label="Previous image"
      disabled={index === 0}
      onclick={prev}
    >
      ‹
    </button>
  {/if}

  {#if src}
    <img {src} {alt} />
  {:else}
    <span class="aib-image-missing">Image not found: {images[index]}</span>
  {/if}

  <button
    type="button"
    class="aib-image-open"
    aria-label="Open image full size"
    onclick={() => ctx.openLightbox(images, index)}
  ></button>

  {#if multi}
    <button
      type="button"
      class="aib-carousel-nav aib-carousel-next"
      aria-label="Next image"
      disabled={index === images.length - 1}
      onclick={next}
    >
      ›
    </button>
    <span class="aib-image-counter" aria-live="polite">{index + 1} / {images.length}</span>
  {/if}
</div>
