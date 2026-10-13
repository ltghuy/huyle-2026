// SCSS samples for the Sass demo; each one's output was checked against Dart Sass.

export const SASS_SAMPLES = [
  {
    value: "card",
    label: "Variables and nesting",
    code: `$radius: 8px;
$brand: #6633cc;

.card {
  border-radius: $radius;
  padding: 1rem;

  // The parent selector: suffixes and states
  &__title {
    color: $brand;
    font-weight: 600;
  }

  &:hover {
    box-shadow: 0 2px 8px #c8c8d0;
  }

  .dark & {
    background: #1f1f2e;
  }

  @media (min-width: 40em) {
    padding: 2rem;
  }
}
`,
  },
  {
    value: "mixin",
    label: "Mixins with arguments",
    code: `@mixin truncate($lines: 1) {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: $lines;
  -webkit-box-orient: vertical;
}

@mixin focus-ring($color) {
  outline: none;

  &:focus-visible {
    box-shadow: 0 0 0 3px $color;
  }
}

.title {
  @include truncate;
}

.summary {
  @include truncate(3);
}

.button {
  border: 0;
  @include focus-ring(#6633cc);
}
`,
  },
  {
    value: "selectors",
    label: "Selector lists and media",
    code: `$gap: 0.5rem;

nav, footer {
  display: flex;
  gap: $gap;

  a, button {
    color: inherit;

    &:hover, &:focus-visible {
      text-decoration: underline;
    }
  }

  @media (max-width: 30em) {
    flex-direction: column;

    @media (orientation: landscape) {
      flex-direction: row;
    }
  }
}
`,
  },
] as const;
