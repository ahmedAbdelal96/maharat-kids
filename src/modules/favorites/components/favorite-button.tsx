"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isCustomerAccessRequiredError, loginPathForReturnTo } from "@/modules/auth/domain/policies";
import { addFavorite, removeFavorite } from "../server/actions";

export function FavoriteButton({
  productId,
  productName,
  isFavorite,
  isAvailable = true,
  mode = "icon",
  className,
  onChange,
}: {
  productId: string;
  productName: string;
  isFavorite: boolean;
  isAvailable?: boolean;
  mode?: "icon" | "button";
  className?: string;
  onChange?: (isFavorite: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    if (busy || (!isAvailable && !isFavorite)) return;
    setBusy(true);
    setError("");
    const result = isFavorite ? await removeFavorite({ productId }) : await addFavorite({ productId });
    if (!result.success) {
      if (isCustomerAccessRequiredError(result.error)) {
        router.push(loginPathForReturnTo(pathname));
      } else {
        setError("This product could not be saved right now.");
      }
    } else {
      onChange?.(!isFavorite);
    }
    setBusy(false);
  }

  const label = isFavorite ? `Remove ${productName} from favorites` : `Save ${productName} to favorites`;
  const button = (
    <Button
      type="button"
      variant="outline"
      size={mode === "icon" ? "icon" : "sm"}
      aria-label={label}
      aria-pressed={isFavorite}
      title={isAvailable || isFavorite ? label : "Unavailable product"}
      disabled={busy || (!isAvailable && !isFavorite)}
      isLoading={busy}
      onClick={() => void toggle()}
      className={className}
    >
      {!busy && <Heart className="h-4 w-4" fill={isFavorite ? "currentColor" : "none"} />}
      {mode === "button" && <span>{isFavorite ? "Saved" : "Save to Favorites"}</span>}
    </Button>
  );

  return error ? <span className="inline-flex flex-col items-end gap-1"><span>{button}</span><span role="alert" className="text-[10px] text-[var(--destructive)]">{error}</span></span> : button;
}
