import PageTransition from '../components/PageTransition'
import DonationGoalTracker from '../components/DonationGoalTracker'

export default function DonationProgressPage() {
  return (
    <PageTransition>
      <DonationGoalTracker variant="detail" />
    </PageTransition>
  )
}
