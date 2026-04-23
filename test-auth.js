// Simple test script to create a user and test microtasks API
fetch('http://localhost:8000/api/auth/register', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        name: 'Test NDA User',
        email: 'test@nda.com',
        password: 'password123'
    })
})
.then(response => response.json())
.then(data => {
    console.log('Registration:', data);
    
    // Now login
    return fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: 'test@nda.com',
            password: 'password123'
        })
    });
})
.then(response => response.json())
.then(loginData => {
    console.log('Login:', loginData);
    const token = loginData.token;
    
    // Store in localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('userName', loginData.name);
    localStorage.setItem('userId', loginData.userId);
    
    console.log('User authenticated! You can now create goals.');
    
    // Test creating a goal
    return fetch('http://localhost:8000/api/microtasks/goals', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            title: 'Master NDA Mathematics Integration',
            description: 'Focus on integration techniques, substitution methods, and solving complex integration problems for NDA exam preparation',
            timeframe: 'weekly',
            difficulty: 'medium'
        })
    });
})
.then(response => response.json())
.then(goalData => {
    console.log('Goal created:', goalData);
    if (goalData.success) {
        console.log('✅ Microtasks generated:');
        goalData.goal.microtasks.forEach((task, i) => {
            console.log(`${i+1}. ${task.title} (${task.category})`);
        });
    }
})
.catch(error => {
    console.error('Error:', error);
});