import { Modal } from '../../components/Modal'
import { SeedlingSowForm } from './SeedlingSowForm'
import type { Seedling } from './api'

// farmId: the nursery the batch is sown into. systemId: a representative system
// in the farm, only used to load the (per-user) crop list.
export function SowModal({ farmId, systemId, seedling, onClose }: { farmId: string; systemId?: string; seedling?: Seedling; onClose: () => void }) {
  const editing = !!seedling
  return (
    <Modal title={editing ? 'Edit sowing' : 'New sowing'} onClose={onClose}>
      <SeedlingSowForm farmId={farmId} systemId={systemId} seedling={seedling} onDone={onClose} onCancel={onClose} />
    </Modal>
  )
}
