import { Modal } from '../../components/Modal'
import { BulkFeedingForm } from './BulkFeedingForm'
import type { FeedingRecord } from './feeding'
import type { FishTank } from './api'

export function FeedingModal({
  systemId,
  tanks,
  previousLog,
  onClose,
}: {
  systemId: string
  tanks: FishTank[]
  previousLog: FeedingRecord[]
  onClose: () => void
}) {
  return (
    <Modal title="Log feeding — all tanks" onClose={onClose} wide>
      <BulkFeedingForm systemId={systemId} tanks={tanks} previousLog={previousLog} onDone={onClose} onCancel={onClose} />
    </Modal>
  )
}
