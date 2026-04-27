import { createBrowserRouter } from 'react-router-dom'
import MobileLayout from './layouts/MobileLayout'
import HomePage from './pages/home/HomePage'
import OnboardingPage from './pages/onboarding/OnboardingPage'
import TracksPage from './pages/tracks/TracksPage'
import TrackMapPage from './pages/track-map/TrackMapPage'
import ChapterPage from './pages/chapter/ChapterPage'
import StagePage from './pages/stage/StagePage'
import ListeningPage from './pages/listening/ListeningPage'
import SpeakingPage from './pages/speaking/SpeakingPage'
import MePage from './pages/me/MePage'
import ReviewPage from './pages/review/ReviewPage'
import AchievementsPage from './pages/achievements/AchievementsPage'
import WrongAnswersPage from './pages/wrong-answers/WrongAnswersPage'
import VocabularyPage from './pages/vocabulary/VocabularyPage'
import QuickQuizPage from './pages/quick-quiz/QuickQuizPage'
import ChallengePage from './pages/challenge/ChallengePage'
import DialoguePracticePage from './pages/dialogue-practice/DialoguePracticePage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MobileLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'tracks', element: <TracksPage /> },
      { path: 'track/:trackId', element: <TrackMapPage /> },
      { path: 'chapter/:chapterId', element: <ChapterPage /> },
      { path: 'stage/:stageId', element: <StagePage /> },
      { path: 'listening', element: <ListeningPage /> },
      { path: 'speaking', element: <SpeakingPage /> },
      { path: 'me', element: <MePage /> },
      { path: 'review', element: <ReviewPage /> },
      { path: 'wrong-answers', element: <WrongAnswersPage /> },
      { path: 'vocabulary', element: <VocabularyPage /> },
      { path: 'achievements', element: <AchievementsPage /> },
      { path: 'quick-quiz/:trackId', element: <QuickQuizPage /> },
      { path: 'challenge/:trackId', element: <ChallengePage /> },
      { path: 'dialogue/:trackId', element: <DialoguePracticePage /> },
    ],
  },
  {
    path: '/onboarding',
    element: <OnboardingPage />,
  },
])
