import Image from "next/image";

/**
 * Props for the Logo component.
 */
interface LogoProps {
  /** Optional CSS class names to apply to the container. */
  className?: string;
  /** The size (height/width) of the logo image in pixels. Defaults to 40. */
  size?: number;
}

/**
 * Displays the application logo with the name "Friendle".
 *
 * @param props - The props for the Logo component.
 * @returns The rendered Logo component.
 */
export default function Logo({ className = "", size = 40 }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative transition-transform hover:scale-110 hover:rotate-3 duration-300">
        <Image 
          src="/logo.svg" 
          alt="Friendle Logo" 
          width={size} 
          height={size}
          className="drop-shadow-lg"
        />
      </div>
      <span className="font-black tracking-tight bg-gradient-to-r from-white to-slate-400 text-transparent bg-clip-text" style={{ fontSize: size * 0.75 }}>
        Friendle
      </span>
    </div>
  );
}
