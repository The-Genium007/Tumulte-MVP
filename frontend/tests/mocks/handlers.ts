import { http, HttpResponse } from "msw";
import {
  createMockUser,
  createMockCampaign,
  createMockPollTemplate,
  createMockPollInstance,
  createMockStreamerSearchResult,
} from "../helpers/mockFactory";

const API_URL = "http://localhost:3333";

export const handlers = [
  // Auth endpoints
  http.get(`${API_URL}/api/v2/auth/me`, () => {
    return HttpResponse.json(createMockUser());
  }),

  http.post(`${API_URL}/api/v2/auth/logout`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.post(`${API_URL}/api/v2/auth/switch-role`, async ({ request }) => {
    const body = (await request.json()) as { role: string };
    return HttpResponse.json(
      createMockUser({ role: body.role as "MJ" | "STREAMER" }),
    );
  }),

  // Campaigns endpoints
  http.get(`${API_URL}/api/v2/mj/campaigns`, () => {
    return HttpResponse.json([
      createMockCampaign({ id: "campaign-1", name: "Campaign 1" }),
      createMockCampaign({ id: "campaign-2", name: "Campaign 2" }),
    ]);
  }),

  http.get(`${API_URL}/api/v2/mj/campaigns/:id`, ({ params }) => {
    return HttpResponse.json(
      createMockCampaign({
        id: params.id as string,
        name: `Campaign ${params.id}`,
      }),
    );
  }),

  http.post(`${API_URL}/api/v2/mj/campaigns`, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      description: string;
    };
    return HttpResponse.json(createMockCampaign(body), { status: 201 });
  }),

  http.put(
    `${API_URL}/api/v2/mj/campaigns/:id`,
    async ({ params, request }) => {
      const body = (await request.json()) as {
        name?: string;
        description?: string;
      };
      return HttpResponse.json(
        createMockCampaign({ id: params.id as string, ...body }),
      );
    },
  ),

  http.delete(`${API_URL}/api/v2/mj/campaigns/:id`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Poll Templates endpoints
  http.get(`${API_URL}/api/v2/mj/campaigns/:campaignId/poll-templates`, () => {
    return HttpResponse.json([
      createMockPollTemplate({ id: "template-1", label: "Template 1" }),
      createMockPollTemplate({ id: "template-2", label: "Template 2" }),
    ]);
  }),

  http.post(
    `${API_URL}/api/v2/mj/campaigns/:campaignId/poll-templates`,
    async ({ request }) => {
      const body = (await request.json()) as Partial<{
        label: string;
        title: string;
        options: string[];
      }>;
      return HttpResponse.json(createMockPollTemplate(body), { status: 201 });
    },
  ),

  // Poll Instances endpoints
  http.post(
    `${API_URL}/api/v2/mj/campaigns/:campaignId/polls/launch`,
    async ({ request }) => {
      const body = (await request.json()) as { templateId: string };
      return HttpResponse.json(
        createMockPollInstance({
          templateId: body.templateId,
          status: "RUNNING",
          startedAt: new Date().toISOString(),
        }),
        { status: 201 },
      );
    },
  ),

  http.post(
    `${API_URL}/api/v2/mj/campaigns/:campaignId/polls/:pollId/cancel`,
    () => {
      return HttpResponse.json(
        createMockPollInstance({
          status: "CANCELLED",
          endedAt: new Date().toISOString(),
        }),
      );
    },
  ),

  // Streamers endpoints
  http.get(`${API_URL}/api/v2/mj/streamers/search`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("query");
    return HttpResponse.json([
      createMockStreamerSearchResult({
        login: query || "searchedstreamer",
        displayName: query || "Searched Streamer",
      }),
    ]);
  }),

  // Campaign Invitations endpoints
  http.post(
    `${API_URL}/api/v2/mj/campaigns/:campaignId/invitations`,
    async ({ request }) => {
      const body = (await request.json()) as { twitchUserId: string };
      return HttpResponse.json(
        { success: true, twitchUserId: body.twitchUserId },
        { status: 201 },
      );
    },
  ),

  http.post(
    `${API_URL}/api/v2/streamer/invitations/:invitationId/accept`,
    () => {
      return HttpResponse.json({ success: true });
    },
  ),

  http.post(
    `${API_URL}/api/v2/streamer/invitations/:invitationId/decline`,
    () => {
      return HttpResponse.json({ success: true });
    },
  ),

  // Authorization endpoints
  http.post(
    `${API_URL}/api/v2/mj/campaigns/:campaignId/members/:memberId/grant-authorization`,
    () => {
      return HttpResponse.json({
        success: true,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      });
    },
  ),

  http.post(
    `${API_URL}/api/v2/mj/campaigns/:campaignId/members/:memberId/revoke-authorization`,
    () => {
      return HttpResponse.json({ success: true });
    },
  ),
];
