// Mock optimizer worker
export default class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  postMessage(data: any) {
    // Simulate async response
    setTimeout(() => {
      if (this.onmessage) {
        if (data.type === 'start') {
          // Send progress updates
          this.onmessage({
            data: {
              type: 'progress',
              progress: {
                generation: 1,
                bestFitness: 0.5,
                message: 'Generation 1 of 10',
              },
            },
          } as MessageEvent);

          // Send completion
          setTimeout(() => {
            if (this.onmessage) {
              this.onmessage({
                data: {
                  type: 'complete',
                  result: {
                    schedule: ['large', 'medium', null, 'small,small', null],
                    workDays: [1, 2, 4],
                    totalEarnings: 595,
                    finalBalance: 1445,
                    minBalance: 1095,
                    violations: 0,
                    computationTime: '0.5s',
                    getFormattedSchedule: () => [],
                  },
                },
              } as MessageEvent);
            }
          }, 50);
        }
      }
    }, 10);
  }

  terminate() {
    // Mock terminate
  }
}
