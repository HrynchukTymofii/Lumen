import "./site.css";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return <div className="site">{children}</div>;
}
