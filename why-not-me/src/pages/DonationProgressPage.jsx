import PageTransition from '../components/PageTransition'
import DonationGoalTracker from '../components/DonationGoalTracker'
import BrainTumourSupportSection from '../components/BrainTumourSupportSection'

export default function DonationProgressPage() {
  return (
    <PageTransition>
      {/*
        The BTSNZ section is passed into the tracker's middle slot so it
        renders directly under the main donation summary (progress bar)
        and above the "All public donations" names and amounts list.
      */}
      <DonationGoalTracker
        variant="detail"
        middleSlot={
          <BrainTumourSupportSection
            eyebrow="Where Your Donation Goes"
            title="Every dollar lands with Brain Tumour Support NZ."
            imageSide="left"
            compact
            paragraphs={[
              'The money raised here goes to Brain Tumour Support NZ, the charity that supported Nicole through her own diagnosis and treatment.',
              'Your donation helps them connect patients with others who truly understand, hold space for families through the hardest moments, and advocate for better, funded treatment options across New Zealand.',
              'You can donate to Nicole\u2019s marathon at No Going Back, or support Brain Tumour Support NZ directly through their website. Both go to the same cause.',
            ]}
          />
        }
      />
    </PageTransition>
  )
}
