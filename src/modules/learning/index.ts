export {
  assertCourseVersionEditable,
  lockCourseVersionOnFirstActivity,
  getCourseVersionIdForModule,
  resolveUserCohortContext,
  CourseVersionLockedError,
} from './course-version';
export {
  createProgram,
  duplicateProgram,
  updateCohortStatus,
  updateCohortSettings,
  addWeek,
  reorderWeeks,
} from './programs';
export {
  upsertModule,
  deleteModule,
  toggleModulePublish,
  reorderModules,
  replaceQuizQuestions,
  ModuleTypeChangeError,
} from './modules';
export {
  getEnrolmentsForUser,
  getEnrolment,
  getActiveEnrolment,
  withdrawEnrolment,
  reinstateEnrolment,
  markCohortEnrolmentsComplete,
} from './enrolment';
export { markReadingDone } from './reading';
export { getQuizForTaking, submitQuizAttempt, QuizError } from './quiz';
export type { QuizForTaking } from './quiz';
export {
  getAssignmentForTaking,
  submitAssignment,
  gradeSubmission,
  AssignmentError,
} from './assignment';
export type { AssignmentForTaking } from './assignment';
export {
  startPlaybackSession,
  recordHeartbeat,
  markAttended,
  overrideAttendance,
  resolveUnlockSeconds,
  AttendanceError,
} from './attendance';
export {
  getCurrentCohortSession,
  getPublishedModulesForWeek,
  computeModuleState,
  computeCohortProgressPercent,
} from './module-state';
export {
  getSyllabus,
  getModuleNeighbors,
  MODULE_ROUTE,
  type Syllabus,
  type SyllabusWeek,
  type SyllabusModule,
} from './syllabus';
export { getProgressReport, type ProgressReport, type ProgressItem } from './progress-report';
export type { ModuleState, ModuleStateTone } from './module-state';
export { computeCohortAttendanceAverage, computeUserAttendancePercent } from './attendance-summary';
export {
  generateInvitation,
  getInvitationsForCohort,
  previewInvitationByToken,
  acceptInvitationByToken,
  declineInvitationByToken,
  getPendingInvitationsForUser,
  acceptInvitationById,
  declineInvitationById,
  InvitationError,
} from './invitations';
export { getCohortRoster, getSubmissionsForCohort } from './roster';
export type { RosterRecordingColumn, RosterRow, CohortSubmission } from './roster';
