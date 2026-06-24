import { createHmac } from 'node:crypto';

export interface FlowConfig {
  apiBase: string;
  apiKey: string;
  secretKey: string;
}

export interface FlowCreatePaymentInput {
  amount: number;
  commerceOrder: string;
  currency: string;
  email: string;
  subject: string;
  urlConfirmation: string;
  urlReturn: string;
}

export interface FlowCreatePaymentResult {
  flowOrder: string;
  redirectUrl: string;
  token: string;
  url: string;
}

export interface FlowStatusResult {
  amount: number;
  commerceOrder: string;
  flowOrder: string;
  status: number;
}

// Flow status codes: 1=pending, 2=paid, 3=rejected, 4=canceled.
export function isPaidFlowStatus(status: number): boolean {
  return status === 2;
}

// Flow signs requests by concatenating the parameters sorted by name as
// "name1value1name2value2..." and producing an HMAC-SHA256 hex digest with the
// secret key. The signature travels in the `s` parameter.
export function signFlowParams(
  params: Record<string, string>,
  secretKey: string,
): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join('');
  return createHmac('sha256', secretKey).update(toSign).digest('hex');
}

export class FlowError extends Error {}

export class FlowClient {
  constructor(private readonly config: FlowConfig) {}

  async createPayment(
    input: FlowCreatePaymentInput,
  ): Promise<FlowCreatePaymentResult> {
    const body = await this.post('/payment/create', {
      amount: String(input.amount),
      apiKey: this.config.apiKey,
      commerceOrder: input.commerceOrder,
      currency: input.currency,
      email: input.email,
      subject: input.subject,
      urlConfirmation: input.urlConfirmation,
      urlReturn: input.urlReturn,
    });

    if (
      typeof body.url !== 'string' ||
      typeof body.token !== 'string' ||
      body.flowOrder === undefined
    ) {
      throw new FlowError('flow_create_unexpected_response');
    }

    return {
      flowOrder: String(body.flowOrder),
      redirectUrl: `${body.url}?token=${body.token}`,
      token: body.token,
      url: body.url,
    };
  }

  async getStatus(token: string): Promise<FlowStatusResult> {
    const body = await this.post('/payment/getStatus', {
      apiKey: this.config.apiKey,
      token,
    });

    if (typeof body.status !== 'number') {
      throw new FlowError('flow_status_unexpected_response');
    }

    return {
      amount: Number(body.amount ?? 0),
      commerceOrder: String(body.commerceOrder ?? ''),
      flowOrder: String(body.flowOrder ?? ''),
      status: body.status,
    };
  }

  private async post(
    path: string,
    params: Record<string, string>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<Record<string, any>> {
    const signed = {
      ...params,
      s: signFlowParams(params, this.config.secretKey),
    };
    const response = await fetch(`${this.config.apiBase}${path}`, {
      body: new URLSearchParams(signed).toString(),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      method: 'POST',
    });
    if (!response.ok) {
      throw new FlowError(`flow_http_${response.status}`);
    }
    return (await response.json()) as Record<string, unknown>;
  }
}
