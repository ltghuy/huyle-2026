// Focus-mode screens (lesson, review session, placement test): no navigation.
export default function FocusLayout({ children }: LayoutProps<"/">) {
  return <div className="min-h-svh bg-background">{children}</div>;
}
