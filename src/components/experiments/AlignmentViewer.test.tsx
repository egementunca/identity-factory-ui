import { render, screen } from '@testing-library/react';
import AlignmentViewer from './AlignmentViewer';

describe('AlignmentViewer', () => {
  it('renders stats and labels from alignment data', () => {
    const matrix = {
      dim: [2, 2] as [number, number],
      data: [0, 0.5, 0.25, 0.75],
    };
    const path = [
      [0, 0],
      [1, 1],
    ];

    render(
      <AlignmentViewer
        matrix={matrix}
        path={path}
        cStar={0.1234}
        title="Test Alignment"
        xLabel="X Axis"
        yLabel="Y Axis"
      />
    );

    expect(screen.getByText('Test Alignment')).toBeInTheDocument();
    expect(screen.getByText('X Axis')).toBeInTheDocument();
    expect(screen.getByText('Y Axis')).toBeInTheDocument();
    expect(screen.getByText(/Cost \(c\*\): 0\.1234/)).toBeInTheDocument();
    expect(screen.getByText('Path Len: 2')).toBeInTheDocument();
    expect(screen.getByText('Warp Ratio: 0.0%')).toBeInTheDocument();
  });

  it('renders fallback message for empty matrices', () => {
    render(<AlignmentViewer matrix={[] as number[][]} />);

    expect(
      screen.getByText('Alignment matrix unavailable.')
    ).toBeInTheDocument();
  });
});
