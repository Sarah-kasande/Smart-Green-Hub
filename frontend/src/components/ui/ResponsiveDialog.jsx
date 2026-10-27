// A dialog on wide screens and a bottom sheet (drawer) on phones, so buttons stay within thumb reach.
// open / onOpenChange as in shadcn's Dialog.
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/shadcn/dialog'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/shadcn/drawer'
import useMediaQuery from './useMediaQuery'

export default function ResponsiveDialog({ open, onOpenChange, title, description, children }) {
  const wide = useMediaQuery('(min-width: 768px)')
  if (wide) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className={description ? '' : 'sr-only'}>{description || title}</DialogDescription>
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    )
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription className={description ? '' : 'sr-only'}>{description || title}</DrawerDescription>
        </DrawerHeader>
        <div className="max-h-[75vh] overflow-y-auto px-4 pb-6">{children}</div>
      </DrawerContent>
    </Drawer>
  )
}
