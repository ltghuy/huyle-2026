import Link from "next/link";

import { Toc } from "@/handbook/toc";
import { Topic } from "@/handbook/topic";
import { practiceHref } from "@/practices/catalog";

import { AltTextDemo } from "./alt-text-demo";
import { AnnotationsDemo } from "./annotations-demo";
import { ContrastDemo } from "./contrast-demo";
import { DynamicDemo } from "./dynamic-demo";
import { FocusDemo } from "./focus-demo";
import { FormsDemo } from "./forms-demo";
import { MediaNeeds } from "./media-needs";
import { MotionDemo } from "./motion-demo";
import { SemanticsDemo } from "./semantics-demo";
import { StructureDemo } from "./structure-demo";
import { TypographyDemo } from "./typography-demo";

const LEARN = "https://web.dev/learn/accessibility";

const TOPICS = [
  { id: "semantic-html-and-aria", title: "Semantic HTML and ARIA" },
  { id: "structure-and-document", title: "Structure and the document" },
  { id: "keyboard-focus", title: "Keyboard focus" },
  { id: "javascript", title: "JavaScript and dynamic content" },
  { id: "images-and-media", title: "Images, video and audio" },
  { id: "color-and-contrast", title: "Color and contrast" },
  { id: "typography", title: "Typography" },
  { id: "animation-and-motion", title: "Animation and motion" },
  { id: "forms", title: "Forms" },
  { id: "patterns-and-design", title: "Patterns, design systems and design" },
] as const;

const inline = "rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function topic(i: number) {
  return { id: TOPICS[i].id, number: i + 1, title: TOPICS[i].title };
}

export function AccessibilityHandbook() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-3xl flex-col gap-3 text-foreground/85">
        <p>
          Digital accessibility (a11y) means people with disabilities can use what you build in a meaningful and equivalent way:
          people who are blind and use a screen reader, who can&apos;t use a mouse, who have low vision, color blindness, hearing
          loss, motion sensitivity or a cognitive disability. Most of it comes from using HTML as intended and checking a few
          rules. This page covers the ideas that matter most, each with a demo; the demos read their own markup to show what
          assistive technology gets.
        </p>
        <p className="text-sm text-muted-foreground">
          Based on the content-design modules of web.dev&apos;s{" "}
          <a href={`${LEARN}/welcome`} target="_blank" rel="noreferrer" className={inline}>
            Learn Accessibility<span className="sr-only"> (opens in a new tab)</span>
          </a>{" "}
          course, shortened to its main concepts. The screen reader output shown here is simplified; real ones differ in wording.
        </p>
      </div>

      <Toc items={TOPICS} />

      <Topic
        {...topic(0)}
        intro={
          <>
            The browser turns your HTML into an <strong>accessibility tree</strong>: every element gets a <strong>role</strong> (what it
            is), a <strong>name</strong> (what it&apos;s called) and <strong>states</strong> (checked, expanded…). Screen readers and
            voice control read that tree, not your pixels.
          </>
        }
        points={[
          <>Native elements come with all three plus keyboard support: a <code>&lt;button&gt;</code> is focusable and works with Enter and Space for free.</>,
          <><strong>ARIA</strong> attributes (<code>role</code>, <code>aria-*</code>) only change the tree. They add no behavior, so a <code>role=&quot;button&quot;</code> still needs <code>tabIndex</code> and key handlers.</>,
          <>The five rules of ARIA: (1) don&apos;t use ARIA if HTML can do it; (2) don&apos;t add ARIA that repeats HTML; (3) every ARIA control must work with a keyboard; (4) never hide focusable elements with <code>aria-hidden</code>; (5) every interactive element needs an accessible name.</>,
          <>Use ARIA for what HTML can&apos;t say: <code>aria-expanded</code>, <code>aria-current</code>, <code>aria-describedby</code>, live regions, and custom widgets that follow the ARIA Authoring Practices.</>,
        ]}
        demoTitle="a clickable div, a div patched with ARIA, and a button"
        demo={<SemanticsDemo />}
        advice={[
          {
            do: <>Reach for the element that already means what you need: <code>&lt;button&gt;</code>, <code>&lt;a href&gt;</code>, <code>&lt;input type=&quot;checkbox&quot;&gt;</code>, <code>&lt;details&gt;</code>, <code>&lt;dialog&gt;</code>.</>,
            avoid: <>A <code>&lt;div onClick&gt;</code>: invisible to the keyboard and announced as plain text.</>,
          },
        ]}
        links={[{ label: "ARIA and HTML", href: `${LEARN}/aria-html` }]}
      />

      <Topic
        {...topic(1)}
        intro={
          <>
            Sighted people skim a page by its layout; screen reader users skim by its <strong>landmarks</strong> and{" "}
            <strong>headings</strong>, jumping between them from a list. If the structure is only visual, there is nothing to jump to.
          </>
        }
        points={[
          <>Landmarks come from <code>&lt;header&gt;</code>, <code>&lt;nav&gt;</code>, <code>&lt;main&gt;</code>, <code>&lt;aside&gt;</code>, <code>&lt;footer&gt;</code>, and a named <code>&lt;section&gt;</code> or <code>&lt;form&gt;</code>. Give repeated ones a label (<code>aria-label=&quot;Main&quot;</code>).</>,
          <>Headings form the outline: one <code>h1</code>, then levels in order without skipping. Pick the level for the structure and style it with CSS.</>,
          <>Lists (<code>ul</code>, <code>ol</code>, <code>dl</code>) say how many items there are; data tables need <code>&lt;th scope&gt;</code> and a <code>&lt;caption&gt;</code>.</>,
          <>The document: a unique, descriptive <code>&lt;title&gt;</code> with the specific part first (it&apos;s the first thing announced), <code>lang</code> on <code>&lt;html&gt;</code> so the right voice is used, <code>lang</code> on parts in another language, and a <code>title</code> on every <code>&lt;iframe&gt;</code>.</>,
        ]}
        demoTitle="the same page built three ways"
        demo={<StructureDemo />}
        advice={[
          {
            do: "Check the outline with a headings or landmarks extension, or your screen reader's rotor, as part of review.",
            avoid: <>Choosing <code>h4</code> because it &quot;looks right&quot;: style the correct level instead.</>,
          },
        ]}
        links={[
          { label: "Content structure", href: `${LEARN}/structure` },
          { label: "The document", href: `${LEARN}/more-html` },
        ]}
      />

      <Topic
        {...topic(2)}
        intro={
          <>
            Many people never use a mouse: they move <strong>focus</strong> with Tab and Shift+Tab, act with Enter and Space, and move
            inside widgets with the arrow keys. They need to reach everything, in a sensible order, and always see where they are.
          </>
        }
        points={[
          <>Focus order follows the DOM. Keep the source order the same as the visual order instead of fixing it with <code>tabindex</code>.</>,
          <><code>tabindex=&quot;0&quot;</code> adds an element to the order, <code>-1</code> makes it focusable only by script (a skip-link target, a dialog). Avoid positive values: they jump to the front of the whole page.</>,
          <>A <strong>skip link</strong> as the first stop lets keyboard users pass the navigation on every page.</>,
          <>Never remove the outline without a replacement. A visible focus indicator needs 3:1 contrast; <code>:focus-visible</code> shows it for keyboard users only.</>,
          <>
            Manage focus when the page changes under the user: move it into an opened dialog and back to the opener on close (see{" "}
            <Link href={practiceHref("accessible-modal")} className={inline}>
              practice 8, Accessible Modal
            </Link>
            ), and to the new heading after a client-side route change.
          </>,
        ]}
        demoTitle="tab through a small site"
        demo={<FocusDemo />}
        advice={[
          {
            do: "Unplug the mouse for five minutes and use your page with the keyboard only.",
            avoid: <><code>outline: none</code> on <code>:focus</code> with no other style.</>,
          },
        ]}
        links={[{ label: "Keyboard focus", href: `${LEARN}/focus` }]}
      />

      <Topic
        {...topic(3)}
        intro={
          <>
            When JavaScript changes the page, sighted users see it; screen reader users only hear about it if the page tells them.
            State changes belong on the element, and status messages go through a <strong>live region</strong>.
          </>
        }
        points={[
          <>Put click handlers on native controls (they get keyboard support); custom ones need <code>keydown</code> handling for Enter and Space.</>,
          <>Reflect state in ARIA: <code>aria-expanded</code> on disclosure buttons, <code>aria-pressed</code> on toggles, <code>aria-current=&quot;page&quot;</code> in navigation.</>,
          <>A live region (<code>role=&quot;status&quot;</code> or <code>aria-live=&quot;polite&quot;</code>; <code>role=&quot;alert&quot;</code> only for urgent errors) must be in the page before its text changes, or nothing is announced.</>,
          <>In a single-page app, update <code>document.title</code> on every route change and move focus to the new content; the framework won&apos;t do it all for you.</>,
        ]}
        demoTitle="what a screen reader hears when the page changes"
        demo={<DynamicDemo />}
        advice={[
          {
            do: <>Keep one empty live region mounted and change its text; see <Link href={practiceHref("searchable-accordion")} className={inline}>practice 2</Link> for <code>aria-expanded</code> panels.</>,
            avoid: "Adding the live region together with its first message, or announcing every keystroke.",
          },
        ]}
        links={[{ label: "JavaScript", href: `${LEARN}/javascript` }]}
      />

      <Topic
        {...topic(4)}
        intro={
          <>
            Every image and media file needs a text alternative that does the same job for someone who can&apos;t see or hear it.
            The right alt text depends on <strong>why</strong> the image is there.
          </>
        }
        points={[
          <><strong>Informative</strong>: say what matters in this context, in under about 150 characters, without &quot;image of&quot;. <strong>Functional</strong> (in a link or button): name the action or destination. <strong>Decorative</strong>: <code>alt=&quot;&quot;</code>, or a CSS background.</>,
          <><strong>Complex</strong> images (charts, maps): a short alt plus the details nearby, in a <code>&lt;figcaption&gt;</code>, a table or a linked description. Inline SVGs need <code>role=&quot;img&quot;</code> and a <code>&lt;title&gt;</code> or <code>aria-label</code>.</>,
          <><strong>Captions</strong> are the speech and meaningful sounds in sync, for people who can&apos;t hear; <strong>subtitles</strong> translate for people who can. <strong>Transcripts</strong> help everyone review and search, and search engines can read them.</>,
          <><strong>Audio description</strong> narrates important visuals between the dialogue; plan it in the script so the video says what it shows.</>,
        ]}
        demoTitle="write alt text for an image, and check what media needs"
        demo={
          <div className="flex flex-col gap-6">
            <AltTextDemo />
            <div className="border-t pt-4">
              <MediaNeeds />
            </div>
          </div>
        }
        advice={[
          {
            do: "Write alt text like you'd describe the image to someone over the phone, for this page's purpose.",
            avoid: "File names, keyword lists, or text baked into images instead of real text.",
          },
        ]}
        links={[
          { label: "Images", href: `${LEARN}/images` },
          { label: "Video and audio", href: `${LEARN}/video-audio` },
        ]}
      />

      <Topic
        {...topic(5)}
        intro={
          <>
            Low vision and color blindness affect hundreds of millions of people, and everyone struggles to read in bright sunlight.
            Text needs enough <strong>contrast</strong>, and meaning must never depend on <strong>color alone</strong>.
          </>
        }
        points={[
          <>WCAG contrast ratios run from 1:1 to 21:1. Normal text needs <strong>4.5:1</strong>; large text (24px, or 18.5px bold) <strong>3:1</strong>; icons, borders and focus indicators <strong>3:1</strong>. The enhanced level is 7:1. Logos and disabled controls are exempt.</>,
          <>Pair color with something else: an icon and text for errors, underlines for links in text, patterns or labels in charts.</>,
          <>Respect user settings: <code>prefers-color-scheme</code> for dark mode, <code>prefers-contrast</code> and forced colors for high-contrast modes, and check both themes.</>,
          <>A grayscale view of a design is a quick test of &quot;color alone&quot;.</>,
        ]}
        demoTitle="a contrast checker, and an error shown by color only"
        demo={<ContrastDemo />}
        advice={[
          {
            do: "Pick text and background tokens that pass in both light and dark themes, and check them in DevTools.",
            avoid: "Light gray placeholder-style text for real content, or red and green as the only difference.",
          },
        ]}
        links={[{ label: "Color and contrast", href: `${LEARN}/color-contrast` }]}
      />

      <Topic
        {...topic(6)}
        intro={
          <>
            Readable type helps people with low vision and dyslexia, and everyone else. Above all, text must be able to{" "}
            <strong>grow</strong>: people zoom to 200% or more and change spacing, and the layout must keep up.
          </>
        }
        points={[
          <>Use a plain, familiar typeface; avoid ornate, handwritten or all-caps text for long reading, and limit bold and italics.</>,
          <>Size text in <code>rem</code> or <code>em</code> so the user&apos;s default size applies; never block zoom in the viewport meta tag.</>,
          <>Let boxes grow with their text: no fixed heights on text containers. WCAG asks content to survive line height 1.5, paragraph spacing 2×, letter spacing 0.12em and word spacing 0.16em.</>,
          <>Keep lines under about 80 characters, align text left (justified text leaves uneven gaps), and break content up with headings and lists.</>,
        ]}
        demoTitle="make the text bigger and wider spaced"
        demo={<TypographyDemo />}
        advice={[
          {
            do: <>Use <code>min-height</code> and let text wrap; test at 200% zoom and at 320 px wide.</>,
            avoid: <>Fixed <code>height</code> with <code>overflow: hidden</code> on anything that holds text.</>,
          },
        ]}
        links={[{ label: "Typography", href: `${LEARN}/typography` }]}
      />

      <Topic
        {...topic(7)}
        intro={
          <>
            Motion can cause dizziness and nausea for people with vestibular disorders, distract people with ADHD, and flashing can
            trigger seizures. Keep animation meaningful, and let people turn it off.
          </>
        }
        points={[
          <>Never flash more than <strong>three times a second</strong>; check video and effects with a tool such as PEAT if in doubt.</>,
          <>Anything that moves, blinks or scrolls on its own for more than <strong>5 seconds</strong> needs a pause, stop or hide control.</>,
          <>Honour <code>prefers-reduced-motion: reduce</code>: replace movement with a fade or no animation, and start parallax, auto-playing carousels and video only when motion is allowed.</>,
        ]}
        demoTitle="a moving banner that respects reduced motion"
        demo={<MotionDemo />}
        advice={[
          {
            do: <>Write motion as an enhancement: <code>@media (prefers-reduced-motion: no-preference)</code> {"{ … }"}.</>,
            avoid: "Auto-playing animation with no way to stop it.",
          },
        ]}
        links={[{ label: "Animation and motion", href: `${LEARN}/motion` }]}
      />

      <Topic
        {...topic(8)}
        intro={
          <>
            Forms are where people get stuck: sign-up, checkout, search. Every field needs a visible <strong>label</strong>, and every
            error must be found, understood and fixed without relying on sight or color.
          </>
        }
        points={[
          <>A <code>&lt;label for&gt;</code> that is always visible; placeholders disappear as you type and often fail contrast.</>,
          <>Group related options with <code>&lt;fieldset&gt;</code> and <code>&lt;legend&gt;</code>; link hints with <code>aria-describedby</code>; add <code>autocomplete</code> so browsers and password managers can fill fields.</>,
          <>On error, say what is wrong and how to fix it in text next to the field, set <code>aria-invalid</code>, and move focus to an error summary that links to each field.</>,
          <>Don&apos;t change context on focus or input (jumping to another page, submitting on select), and confirm success in words.</>,
          <>
            For long forms, split them into steps with a clear progress indicator (see{" "}
            <Link href={practiceHref("multi-step-form")} className={inline}>
              practice 10, Multi-step Form
            </Link>
            ).
          </>,
        ]}
        demoTitle="the same form, built two ways"
        demo={<FormsDemo />}
        advice={[
          {
            do: "Validate on submit (or on leaving a field), and keep the user's input when showing errors.",
            avoid: "A red border as the only sign of an error, or errors listed only at the top with no link to the field.",
          },
        ]}
        links={[{ label: "Forms", href: `${LEARN}/forms` }]}
      />

      <Topic
        {...topic(9)}
        intro={
          <>
            Accessibility scales through teams: build it into shared <strong>components</strong> once, and into{" "}
            <strong>design</strong> before any code exists.
          </>
        }
        points={[
          <>Start from proven patterns (ARIA Authoring Practices, GOV.UK, USWDS, Inclusive Components), but test any copied code yourself with your own browsers and screen readers.</>,
          <>A design system is the best place to fix things once: names, focus styles, contrast tokens and keyboard behavior in every button, menu and dialog.</>,
          <>Inclusive design: offer a comparable experience, consider the situation (one hand, bright sun, slow network), use familiar conventions, give people control, and offer more than one way to do things.</>,
          <>Personas that include permanent, temporary and situational disabilities keep these needs in view; <strong>annotations</strong> hand landmarks, headings, focus order and names to developers.</>,
          <>Test with automated tools (they find about a third of issues), then by hand with the keyboard and a screen reader, and above all with disabled people; simulators are no substitute.</>,
        ]}
        demoTitle="accessibility annotations on a component"
        demo={<AnnotationsDemo />}
        advice={[
          {
            do: "Put accessibility notes in the design file and acceptance criteria, so they are built, not bolted on.",
            avoid: "Treating a passing automated audit as proof that a page is accessible.",
          },
        ]}
        links={[
          { label: "Patterns, components and design systems", href: `${LEARN}/patterns` },
          { label: "Design and user experience", href: `${LEARN}/design-ux` },
          { label: "Automated testing", href: `${LEARN}/test-automated` },
          { label: "Manual testing", href: `${LEARN}/test-manual` },
          { label: "Assistive technology testing", href: `${LEARN}/test-assistive-technology` },
        ]}
      />
    </div>
  );
}
