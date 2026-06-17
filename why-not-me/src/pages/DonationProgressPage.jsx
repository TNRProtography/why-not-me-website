import PageTransition from '../components/PageTransition'
import DonationGoalTracker from '../components/DonationGoalTracker'
import BrainTumourSupportSection from '../components/BrainTumourSupportSection'

export default function DonationProgressPage() {
  return (
    <PageTransition>
      <DonationGoalTracker variant="detail" />

      {/* ========== WHERE THE MONEY GOES: BRAIN TUMOUR SUPPORT NZ ========== */}
      <BrainTumourSupportSection
        eyebrow="Where Your Donation Goes"
        title="Every dollar lands with Brain Tumour Support NZ."
        imageSide="left"
        paragraphs={[
          'The money raised here goes to Brain Tumour Support NZ, the charity that supported Nicole through her own diagnosis and treatment.',
          'Your donation helps them connect patients with others who truly understand, hold space for families through the hardest moments, and advocate for better, funded treatment options across New Zealand.',
          'You can donate to Nicole\u2019s marathon at No Going Back, or support Brain Tumour Support NZ directly through their website. Both go to the same cause.',
        ]}
      />
    </PageTransition>
  )
}
