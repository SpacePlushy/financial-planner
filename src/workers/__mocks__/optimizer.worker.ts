// Mock optimizer worker
export default class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  
  private _terminated = false;
  private _paused = false;

  // Jest mocks for tracking calls
  postMessage = jest.fn((data: any) => {
    this._postMessage(data);
  });
  
  terminate = jest.fn(() => {
    this._terminate();
  });

  private _postMessage(data: any) {
    // Don't process messages if terminated
    if (this._terminated) {
      return;
    }

    // Simulate async response
    setTimeout(() => {
      if (this.onmessage && !this._terminated) {
        switch (data.type) {
          case 'start':
            // Send progress updates
            this.onmessage({
              data: {
                type: 'progress',
                data: {
                  generation: 1,
                  bestFitness: 0.5,
                  message: 'Generation 1 of 10',
                  totalGenerations: 10,
                  currentBestSchedule: ['large', 'medium', null, 'small,small', null],
                  estimatedTimeRemaining: '0.5s',
                },
              },
            } as MessageEvent);

            // Send completion
            setTimeout(() => {
              if (this.onmessage && !this._terminated) {
                this.onmessage({
                  data: {
                    type: 'complete',
                    data: {
                      schedule: ['large', 'medium', null, 'small,small', null],
                      workDays: [1, 2, 4],
                      totalEarnings: 595,
                      finalBalance: 1445,
                      minBalance: 1095,
                      violations: 0,
                      computationTime: '0.5s',
                      formattedSchedule: [
                        { day: 1, shifts: ['large'], earnings: 200 },
                        { day: 2, shifts: ['medium'], earnings: 150 },
                        { day: 4, shifts: ['small', 'small'], earnings: 245 },
                      ],
                    },
                  },
                } as MessageEvent);
              }
            }, 50);
            break;

          case 'cancel':
            this.onmessage({
              data: {
                type: 'cancelled',
                data: null,
              },
            } as MessageEvent);
            break;

          case 'pause':
            this._paused = true;
            this.onmessage({
              data: {
                type: 'paused',
                data: null,
              },
            } as MessageEvent);
            break;

          case 'resume':
            this._paused = false;
            this.onmessage({
              data: {
                type: 'resumed',
                data: null,
              },
            } as MessageEvent);
            break;

          default:
            // Handle unknown message types
            break;
        }
      }
    }, 10);
  }

  private _terminate() {
    this._terminated = true;
    this.onmessage = null;
    this.onerror = null;
  }

  // Mock addEventListener method for compatibility
  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (type === 'message' && typeof listener === 'function') {
      this.onmessage = listener as any;
    } else if (type === 'error' && typeof listener === 'function') {
      this.onerror = listener as any;
    }
  }

  // Mock removeEventListener method for compatibility
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (type === 'message') {
      this.onmessage = null;
    } else if (type === 'error') {
      this.onerror = null;
    }
  }
}