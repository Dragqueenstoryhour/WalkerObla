import ourStoryImage from "@assets/ChatGPT Image Jun 15, 2025, 10_33_48 AM_1749998037507.png";

export default function OurStory() {
  return (
    <div className="min-h-screen bg-white text-blue-800 flex items-center justify-center py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center space-y-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-8">Our Story</h1>

          {/* Card 1 */}
          <div className="bg-blue-600 text-white p-8 rounded-lg shadow-lg border-4 border-blue-600 mx-auto max-w-2xl mb-8">
            <div className="space-y-6 text-lg leading-relaxed text-left">
              <p>
                Speech is one of the most fundamental ways we connect with others. When a stroke or brain injury disrupts that, it can be incredibly challenging.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>At Obla, we believe no one should have to face that journey alone. That’s why we’re here to offer tools and a path forward for anyone rebuilding their confidence in speaking!</li>
              </ul>
              <p>
                Whether you're working alongside a speech therapist or navigating recovery on your own, Obla aims to offer personalized speech support that is accessible to everyone.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-blue-600 text-white p-8 rounded-lg shadow-lg border-4 border-blue-600 mx-auto max-w-2xl mb-8">
            <div className="space-y-6 text-lg leading-relaxed text-left">
              <p>
                Obla blends advanced speech technology with meaningful, individualized learning experiences.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>With real-time pronunciation feedback, content that adapts to each person's needs, and clear progress tracking, we're helping stroke and brain injury survivors and others take meaningful steps toward clearer, more confident speech.</li>
              </ul>
              <p>
                Every feature we create is inspired by the real experiences of people and their journey to recovery. With the right support and tools, everyone can make meaningful progress towards finding their voice again.
              </p>
            </div>
          </div>

          {/* Card 3 with image */}
          <div className="bg-blue-600 text-white p-8 rounded-lg shadow-lg border-4 border-blue-600 mx-auto max-w-2xl">
            <div className="space-y-6 text-lg leading-relaxed text-center"> {/* Centered text */}
              <p className="text-xl font-bold italic mb-4">
                Servitium per technologiam - service through technology.
              </p>
              <p className="text-xl font-semibold">
                Together, we’re reimagining what speech therapy can be — accessible, adaptive, and engaging for everyone.
              </p>
              <div className="mt-8 flex justify-center">
                <img
                  src={ourStoryImage}
                  alt="Our founders working together on Obla"
                  className="max-w-full h-auto rounded-lg shadow-lg border-4 border-white"
                  style={{ maxHeight: '400px' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}