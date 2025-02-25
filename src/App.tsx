import React, { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';

interface Allergen {
  id: string;
  name: string;
  selected: boolean;
}

function App() {
  const [allergens, setAllergens] = useState<Allergen[]>([
    { id: 'milk', name: 'Milk', selected: false },
    { id: 'eggs', name: 'Eggs', selected: false },
    { id: 'peanuts', name: 'Peanuts', selected: false },
    { id: 'treeNuts', name: 'Tree Nuts', selected: false },
    { id: 'soy', name: 'Soy', selected: false },
    { id: 'wheat', name: 'Wheat', selected: false },
    { id: 'gluten', name: 'Gluten', selected: false },
    { id: 'fish', name: 'Fish', selected: false },
    { id: 'shellfish', name: 'Shellfish', selected: false },
    { id: 'mollusks', name: 'Mollusks', selected: false },
    { id: 'sesame', name: 'Sesame', selected: false },
    { id: 'mustard', name: 'Mustard', selected: false },
    { id: 'celery', name: 'Celery', selected: false },
    { id: 'lupin', name: 'Lupin', selected: false },
  ]);
  const [otherAllergens, setOtherAllergens] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [foodItems, setFoodItems] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleAllergen = (id: string) => {
    setAllergens(allergens.map(allergen => 
      allergen.id === id ? { ...allergen, selected: !allergen.selected } : allergen
    ));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setResponse(null);
    setFoodItems([]);

    const selectedAllergens = allergens
      .filter(allergen => allergen.selected)
      .map(allergen => allergen.name);

    const payload = {
      allergens: selectedAllergens,
      otherAllergens: otherAllergens.trim(),
    };

    console.log('Sending payload:', payload);

    try {
      console.log('Making fetch request...');
      const response = await fetch('https://hook.us2.make.com/2ib5f91l3mw3dlfznaz3jiq4y2vk90lp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      if (responseText) {
        const items = JSON.parse(responseText) as string[];
        console.log('Parsed JSON response:', items);
        
        if (Array.isArray(items) && items.length > 0) {
          setFoodItems(items);
          setResponse('Here are the menu items you can safely enjoy:');
        } else {
          setResponse('No suitable menu items found based on your allergies.');
        }
      } else {
        console.log('Empty response received');
        setResponse('Unable to determine suitable menu items. Please ask your server for assistance.');
      }
    } catch (error) {
      console.error('Submission error:', error);
      setResponse('Error processing your allergens. Please try again or ask your server for assistance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 p-6">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-3xl font-bold text-blue-800 mb-2">AI-llergy</h1>
          <p className="text-gray-600 mb-6">Please select any allergens that apply to you:</p>

          <div className="space-y-3">
            {allergens.map((allergen) => (
              <button
                key={allergen.id}
                onClick={() => toggleAllergen(allergen.id)}
                className={`w-full p-3 rounded-lg flex items-center justify-between transition-colors ${
                  allergen.selected
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{allergen.name}</span>
                <CheckCircle2 
                  className={`w-6 h-6 transition-opacity ${
                    allergen.selected ? 'opacity-100 text-blue-600' : 'opacity-30'
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="mt-6">
            <label htmlFor="other" className="block text-sm font-medium text-gray-700 mb-2">
              Other Allergens
            </label>
            <textarea
              id="other"
              value={otherAllergens}
              onChange={(e) => setOtherAllergens(e.target.value)}
              placeholder="Please list any other allergens..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          {response && (
            <div className="mt-6">
              <div className={`p-4 rounded-lg ${
                response.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-800'
              }`}>
                {response}
              </div>
              
              {foodItems.length > 0 && (
                <div className="mt-4 space-y-2">
                  {foodItems.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 bg-green-50 text-green-800 rounded-lg flex items-center"
                    >
                      <CheckCircle2 className="w-5 h-5 mr-2 text-green-600" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="mt-6 w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium flex items-center justify-center space-x-2 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
            <span>{isSubmitting ? 'Submitting...' : 'Submit Allergens'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;