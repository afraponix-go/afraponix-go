import { Modal } from '../../components/Modal'
import { PlantingForm } from './PlantingForm'

export function NewPlantingModal({ initialBedId, onClose }: { initialBedId?: number; onClose: () => void }) {
  return (
    <Modal title="New planting" onClose={onClose}>
      <PlantingForm initialBedId={initialBedId} onDone={onClose} onCancel={onClose} />
    </Modal>
  )
}
