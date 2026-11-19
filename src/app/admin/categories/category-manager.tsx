"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { FolderTree, Pencil, Plus, Trash2 } from "lucide-react";
import type { CategoryAdminRow } from "@/modules/categories/repo";
import { deleteCategoryAction, saveCategoryAction } from "@/modules/categories/actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ImageUpload } from "@/components/admin/image-upload";
import { ProductImage } from "@/components/shared/product-image";
import { categoryPhoto } from "@/lib/produce-photos";
import { useToast } from "@/components/ui/toast";
import { slugify } from "@/lib/utils";

export function CategoryManager({ categories }: { categories: CategoryAdminRow[] }) {
  const [editing, setEditing] = useState<CategoryAdminRow | "new" | null>(categories.length === 0 ? "new" : null);
  const [deleting, setDeleting] = useState<CategoryAdminRow | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();

  return (
    <div className="mt-6 space-y-4">
      {editing === null && (
        <Button icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>
          Add category
        </Button>
      )}
      {editing !== null && (
        <CategoryForm
          key={editing === "new" ? "new" : editing.id}
          category={editing === "new" ? undefined : editing}
          onDone={() => setEditing(null)}
        />
      )}
      <Card className="overflow-hidden">
        {categories.length ? (
          <ul className="divide-y divide-line">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-beige">
                  <ProductImage src={c.imageUrl} fallbackSrc={categoryPhoto(c.slug)} alt={c.name} sizes="48px" showLabel={false} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-bold">
                    {c.name} {!c.isActive && <Badge>Hidden</Badge>}
                  </p>
                  <p className="text-sm text-muted-strong">
                    #{c.sortOrder} · {c.productCount} {c.productCount === 1 ? "product" : "products"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(c)}
                  className="rounded-full p-2 text-muted-strong hover:bg-primary-soft hover:text-forest"
                  aria-label={`Edit ${c.name}`}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(c)}
                  className="rounded-full p-2 text-muted-strong hover:bg-danger-soft hover:text-danger"
                  aria-label={`Delete ${c.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<FolderTree className="size-6" />}
            title="No categories yet"
            description="Start with Fruits, Vegetables and Leafy Greens."
          />
        )}
      </Card>
      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${deleting?.name}?`}
        description={
          deleting?.productCount
            ? "This category still has products. Move them to another category first, or hide this category instead."
            : "This can't be undone."
        }
        confirmLabel="Delete"
        tone="danger"
        loading={pending}
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          start(async () => {
            const r = await deleteCategoryAction(deleting!.id);
            setDeleting(null);
            toast(r.ok ? (r.message ?? "Deleted") : r.error, r.ok ? "success" : "error");
          })
        }
      />
    </div>
  );
}

function CategoryForm({ category, onDone }: { category?: CategoryAdminRow; onDone: () => void }) {
  const [state, action] = useActionState(saveCategoryAction, null);
  const [slug, setSlug] = useState(category?.slug ?? "");
  const toast = useToast();
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  useEffect(() => {
    if (state?.ok) {
      toast(state.message ?? "Saved");
      onDone();
    }
  }, [state, toast, onDone]);
  return (
    <Card className="p-5 sm:p-6">
      <form action={action} className="grid gap-5 md:grid-cols-[1fr_14rem]" noValidate>
        {category && <input type="hidden" name="categoryId" value={category.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            name="name"
            defaultValue={category?.name}
            required
            errors={fe?.name}
            onChange={(e) => !category && setSlug(slugify(e.target.value))}
          />
          <Input label="Link name" name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required errors={fe?.slug} />
          <Input
            label="Display order"
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={category?.sortOrder ?? 0}
            errors={fe?.sortOrder}
          />
          <Checkbox name="isActive" defaultChecked={category?.isActive ?? true} label="Visible in store" className="self-end pb-3" />
          <Textarea
            label="Short description"
            name="description"
            optional
            defaultValue={category?.description}
            maxLength={500}
            wrapperClassName="sm:col-span-2"
            errors={fe?.description}
          />
          <div className="space-y-3 sm:col-span-2">
            <FormMessage state={state && !state.ok ? state : null} />
            <div className="flex gap-2">
              <SubmitButton pendingText="Saving…">{category ? "Save category" : "Create category"}</SubmitButton>
              <Button variant="ghost" onClick={onDone}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
        <ImageUpload
          name="imageUrl"
          defaultUrl={category?.imageUrl ?? null}
          folder="categories"
          label="Category photo"
          aspect="aspect-[4/5]"
        />
      </form>
    </Card>
  );
}
