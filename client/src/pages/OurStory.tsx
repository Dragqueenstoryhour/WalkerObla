import ourStoryImage from "@assets/ChatGPT Image Jun 15, 2025, 10_33_48 AM_1749998037507.png";

export default function OurStory() {
  return (
    <div className="min-h-screen bg-blue-600 text-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center space-y-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-8">Our Story</h1>
          
          <div className="space-y-6 text-lg leading-relaxed">
            <p>
              Speech is one of our most fundamental ways of connecting with others. When stroke or other conditions 
              affect our ability to communicate clearly, it can feel isolating and frustrating. We founded Obla 
              because we believe everyone deserves the tools and support they need to rebuild their confidence in speaking.
            </p>
            
            <p>
              Our journey began when we witnessed firsthand how traditional speech therapy, while effective, 
              often lacks the personalized, accessible practice opportunities that patients need between sessions. 
              We saw an opportunity to bridge this gap using cutting-edge AI technology and compassionate design.
            </p>
            
            <p>
              Obla combines advanced speech assessment technology with personalized learning experiences, 
              creating a safe space where users can practice at their own pace. Our AI-powered pronunciation 
              feedback, adaptive content generation, and progress tracking are designed specifically for 
              stroke survivors and others working to improve their speech clarity.
            </p>
            
            <p>
              We're not just building an app – we're creating a community of support, progress, and hope. 
              Every feature we develop is guided by the real experiences and needs of people on their 
              recovery journey. Because we believe that with the right tools and encouragement, 
              everyone can find their voice again.
            </p>
            
            <p className="text-xl font-semibold">
              Together, we're making speech therapy more accessible, engaging, and effective for everyone.
            </p>
          </div>
          
          <div className="mt-12 flex justify-center">
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
  );
}