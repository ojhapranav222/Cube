import RubiksCube from '@/components/RubiksCubeFixed';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <h1 className="text-3xl font-bold text-white text-center mb-2">
          Interactive Rubik&apos;s Cube
        </h1>
        <p className="text-gray-300 text-center text-sm">
          Use the controls to rotate faces, or drag to rotate the view
        </p>
      </div>
      <RubiksCube />
    </div>
  );
}
