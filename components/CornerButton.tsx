import Link from "next/link";

type Common = {
  variant: "primary" | "secondary";
  children: React.ReactNode;
  ariaLabel?: string;
};

type LinkProps = Common & { href: string; external?: boolean; onClick?: never };
type ButtonProps = Common & {
  href?: never;
  onClick: () => void;
  disabled?: boolean;
};

function Corners() {
  return (
    <>
      <span className="btn-corner btn-corner--tl" aria-hidden="true" />
      <span className="btn-corner btn-corner--tr" aria-hidden="true" />
      <span className="btn-corner btn-corner--bl" aria-hidden="true" />
      <span className="btn-corner btn-corner--br" aria-hidden="true" />
    </>
  );
}

/** Portfolio button with corner brackets — renders a link or a button. */
export default function CornerButton(props: LinkProps | ButtonProps) {
  const inner = <span className={`btn btn--${props.variant}`}>{props.children}</span>;

  if (props.href !== undefined) {
    const { href, external } = props;
    if (external) {
      return (
        <a
          href={href}
          className="btn-frame"
          aria-label={props.ariaLabel}
          target="_blank"
          rel="noopener noreferrer"
        >
          {inner}
          <Corners />
        </a>
      );
    }
    return (
      <Link href={href} className="btn-frame" aria-label={props.ariaLabel}>
        {inner}
        <Corners />
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="btn-frame"
      onClick={props.onClick}
      disabled={props.disabled}
      aria-label={props.ariaLabel}
    >
      {inner}
      <Corners />
    </button>
  );
}
