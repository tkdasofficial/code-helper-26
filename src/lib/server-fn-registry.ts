/* eslint-disable */
import * as account from "@/lib/account.functions";
import * as auth from "@/lib/auth.functions";
import * as generation from "@/lib/generation.functions";
import * as jobs from "@/lib/jobs.functions";
import * as profile from "@/lib/profile.functions";
import * as socialManage from "@/lib/social-manage.functions";
import * as social from "@/lib/social.functions";
import * as videoAgent from "@/lib/video-agent.functions";
import * as virtualModel from "@/lib/virtual-model.functions";
import * as workflows from "@/lib/workflows.functions";
import * as youtube from "@/lib/youtube.functions";

export const serverFunctionRegistry: Record<string, any> = {
  // account
  getMyAccount: account.getMyAccount,
  // auth
  checkEmailExists: auth.checkEmailExists,
  recordEmailRegistered: auth.recordEmailRegistered,
  // generation
  uploadReference: generation.uploadReference,
  saveImageResult: generation.saveImageResult,
  listGenerations: generation.listGenerations,
  deleteGeneration: generation.deleteGeneration,
  // jobs
  enqueueJob: jobs.enqueueJob,
  listJobs: jobs.listJobs,
  cancelJob: jobs.cancelJob,
  getJob: jobs.getJob,
  // profile
  getMyProfile: profile.getMyProfile,
  completeOnboarding: profile.completeOnboarding,
  // social
  getMetaConfig: social.getMetaConfig,
  listSocialConnections: social.listSocialConnections,
  completeMetaConnection: social.completeMetaConnection,
  disconnectSocialAccount: social.disconnectSocialAccount,
  // social manage
  manageSocialPost: socialManage.manageSocialPost,
  // video agent
  startVideoRender: videoAgent.startVideoRender,
  getVideoPlaybackUrl: videoAgent.getVideoPlaybackUrl,
  // virtual model
  listVirtualModels: virtualModel.listVirtualModels,
  deleteVirtualModel: virtualModel.deleteVirtualModel,
  // workflows
  listWorkflows: workflows.listWorkflows,
  getWorkflow: workflows.getWorkflow,
  saveWorkflow: workflows.saveWorkflow,
  setWorkflowEnabled: workflows.setWorkflowEnabled,
  deleteWorkflow: workflows.deleteWorkflow,
  runWorkflowNow: workflows.runWorkflowNow,
  // youtube
  getYouTubeConfig: youtube.getYouTubeConfig,
  completeYouTubeConnection: youtube.completeYouTubeConnection,
};

for (const [name, fn] of Object.entries(serverFunctionRegistry)) {
  if (fn && (typeof fn === "object" || typeof fn === "function")) {
    (fn as any).__name = name;
  }
}
