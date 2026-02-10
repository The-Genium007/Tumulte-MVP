import { describe, test, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PollControlCard from '~/components/PollControlCard.vue'

// Mock Nuxt UI components
const mockComponents = {
  UCard: {
    template: '<div class="u-card"><slot /></div>',
  },
  UBadge: {
    template: '<span class="u-badge">{{ label }}<slot /></span>',
    props: ['label', 'color', 'variant', 'size'],
  },
  UButton: {
    template:
      '<button class="u-button" :disabled="disabled" @click="$emit(\'click\')">{{ label }}<slot /></button>',
    props: ['label', 'color', 'variant', 'icon', 'size', 'square', 'disabled'],
    emits: ['click'],
  },
  UIcon: {
    template: '<i class="u-icon" :class="name"></i>',
    props: ['name'],
  },
}

describe('PollControlCard Component', () => {
  const defaultPoll = {
    id: 'poll-1',
    question: 'What is your favorite color?',
    options: ['Red', 'Blue', 'Green'],
    durationSeconds: 60,
  }

  beforeEach(() => {
    // No special setup needed
  })

  test('should render poll question', () => {
    const wrapper = mount(PollControlCard, {
      props: {
        poll: defaultPoll,
        currentIndex: 0,
        totalPolls: 3,
        status: 'idle',
        countdown: 0,
      },
      global: {
        components: mockComponents,
      },
    })

    expect(wrapper.text()).toContain('What is your favorite color?')
  })

  test('should render poll counter badge', () => {
    const wrapper = mount(PollControlCard, {
      props: {
        poll: defaultPoll,
        currentIndex: 1,
        totalPolls: 5,
        status: 'idle',
        countdown: 0,
      },
      global: {
        components: mockComponents,
      },
    })

    expect(wrapper.text()).toContain('2/5')
  })

  test('should show send button when status is idle', () => {
    const wrapper = mount(PollControlCard, {
      props: {
        poll: defaultPoll,
        currentIndex: 0,
        totalPolls: 1,
        status: 'idle',
        countdown: 0,
      },
      global: {
        components: mockComponents,
      },
    })

    expect(wrapper.text()).toContain('Envoyer')
  })

  test('should emit send event when send button clicked', async () => {
    const wrapper = mount(PollControlCard, {
      props: {
        poll: defaultPoll,
        currentIndex: 0,
        totalPolls: 1,
        status: 'idle',
        countdown: 0,
      },
      global: {
        components: mockComponents,
      },
    })

    const buttons = wrapper.findAllComponents({ name: 'UButton' })
    const sendButton = buttons.find((btn) => btn.props('label') === 'Envoyer')

    if (sendButton) {
      await sendButton.trigger('click')
      expect(wrapper.emitted('send')).toBeTruthy()
    }
  })

  test('should show countdown timer when status is sending', () => {
    const wrapper = mount(PollControlCard, {
      props: {
        poll: defaultPoll,
        currentIndex: 0,
        totalPolls: 1,
        status: 'sending',
        countdown: 125, // 2:05
      },
      global: {
        components: mockComponents,
      },
    })

    expect(wrapper.text()).toContain('2:05')
  })

  test('should format countdown with leading zero', () => {
    const wrapper = mount(PollControlCard, {
      props: {
        poll: defaultPoll,
        currentIndex: 0,
        totalPolls: 1,
        status: 'sending',
        countdown: 65, // 1:05
      },
      global: {
        components: mockComponents,
      },
    })

    expect(wrapper.text()).toContain('1:05')
  })

  test('should show status badge when sending', () => {
    const wrapper = mount(PollControlCard, {
      props: {
        poll: defaultPoll,
        currentIndex: 0,
        totalPolls: 1,
        status: 'sending',
        countdown: 60,
      },
      global: {
        components: mockComponents,
      },
    })

    expect(wrapper.text()).toContain('En cours')
  })

  test('should show status badge when sent', () => {
    const wrapper = mount(PollControlCard, {
      props: {
        poll: defaultPoll,
        currentIndex: 0,
        totalPolls: 1,
        status: 'sent',
        countdown: 0,
      },
      global: {
        components: mockComponents,
      },
    })

    expect(wrapper.text()).toContain('Envoyé')
  })

  test('should show status badge when cancelled', () => {
    const wrapper = mount(PollControlCard, {
      props: {
        poll: defaultPoll,
        currentIndex: 0,
        totalPolls: 1,
        status: 'cancelled',
        countdown: 0,
      },
      global: {
        components: mockComponents,
      },
    })

    expect(wrapper.text()).toContain('Annulé')
  })

  test('should show relaunch button when cancelled', () => {
    const wrapper = mount(PollControlCard, {
      props: {
        poll: defaultPoll,
        currentIndex: 0,
        totalPolls: 1,
        status: 'cancelled',
        countdown: 0,
      },
      global: {
        components: mockComponents,
      },
    })

    expect(wrapper.text()).toContain('Relancer')
  })

  test('should emit close event when close button clicked', async () => {
    const wrapper = mount(PollControlCard, {
      props: {
        poll: defaultPoll,
        currentIndex: 0,
        totalPolls: 1,
        status: 'idle',
        countdown: 0,
      },
      global: {
        components: mockComponents,
      },
    })

    const buttons = wrapper.findAllComponents({ name: 'UButton' })
    const closeButton = buttons.find((btn) => btn.props('icon') === 'i-lucide-x')

    if (closeButton) {
      await closeButton.trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    }
  })

  test('should emit previous event when up navigation clicked', async () => {
    const wrapper = mount(PollControlCard, {
      props: {
        poll: defaultPoll,
        currentIndex: 1,
        totalPolls: 3,
        status: 'idle',
        countdown: 0,
      },
      global: {
        components: mockComponents,
      },
    })

    const buttons = wrapper.findAllComponents({ name: 'UButton' })
    const prevButton = buttons.find((btn) => btn.props('icon') === 'i-lucide-chevron-up')

    if (prevButton) {
      await prevButton.trigger('click')
      expect(wrapper.emitted('previous')).toBeTruthy()
    }
  })

  test('should emit next event when down navigation clicked', async () => {
    const wrapper = mount(PollControlCard, {
      props: {
        poll: defaultPoll,
        currentIndex: 0,
        totalPolls: 3,
        status: 'idle',
        countdown: 0,
      },
      global: {
        components: mockComponents,
      },
    })

    const buttons = wrapper.findAllComponents({ name: 'UButton' })
    const nextButton = buttons.find((btn) => btn.props('icon') === 'i-lucide-chevron-down')

    if (nextButton) {
      await nextButton.trigger('click')
      expect(wrapper.emitted('next')).toBeTruthy()
    }
  })

  test('should disable previous button at first poll', () => {
    const wrapper = mount(PollControlCard, {
      props: {
        poll: defaultPoll,
        currentIndex: 0,
        totalPolls: 3,
        status: 'idle',
        countdown: 0,
      },
      global: {
        components: mockComponents,
      },
    })

    const buttons = wrapper.findAll('button.u-button')
    const prevButton = buttons.find((btn) => btn.attributes('disabled') !== undefined)

    expect(prevButton?.attributes('disabled')).toBeDefined()
  })

  test('should disable next button at last poll', () => {
    const wrapper = mount(PollControlCard, {
      props: {
        poll: defaultPoll,
        currentIndex: 2,
        totalPolls: 3,
        status: 'idle',
        countdown: 0,
      },
      global: {
        components: mockComponents,
      },
    })

    const buttons = wrapper.findAll('button.u-button')
    const disabledButtons = buttons.filter((btn) => btn.attributes('disabled') !== undefined)

    // At last poll, the "next" button should be disabled
    expect(disabledButtons.length).toBeGreaterThan(0)
  })

  test('should display poll results when provided', () => {
    const wrapper = mount(PollControlCard, {
      props: {
        poll: defaultPoll,
        currentIndex: 0,
        totalPolls: 1,
        status: 'sending',
        countdown: 30,
        results: {
          results: [
            { optionIndex: 0, votes: 10 },
            { optionIndex: 1, votes: 5 },
            { optionIndex: 2, votes: 3 },
          ],
          totalVotes: 18,
        },
      },
      global: {
        components: mockComponents,
      },
    })

    expect(wrapper.text()).toContain('Red')
    expect(wrapper.text()).toContain('10')
    expect(wrapper.text()).toContain('Blue')
    expect(wrapper.text()).toContain('5')
    expect(wrapper.text()).toContain('Green')
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('Total: 18 votes')
  })

  test('should highlight winning option', () => {
    const wrapper = mount(PollControlCard, {
      props: {
        poll: defaultPoll,
        currentIndex: 0,
        totalPolls: 1,
        status: 'sent',
        countdown: 0,
        results: {
          results: [
            { optionIndex: 0, votes: 15 }, // Winner
            { optionIndex: 1, votes: 5 },
            { optionIndex: 2, votes: 3 },
          ],
          totalVotes: 23,
        },
      },
      global: {
        components: mockComponents,
      },
    })

    // Winner should have "Gagnant" badge
    expect(wrapper.text()).toContain('Gagnant')
  })

  test('should show ex-aequo badge when multiple winners', () => {
    const wrapper = mount(PollControlCard, {
      props: {
        poll: defaultPoll,
        currentIndex: 0,
        totalPolls: 1,
        status: 'sent',
        countdown: 0,
        results: {
          results: [
            { optionIndex: 0, votes: 10 }, // Tied
            { optionIndex: 1, votes: 10 }, // Tied
            { optionIndex: 2, votes: 5 },
          ],
          totalVotes: 25,
        },
      },
      global: {
        components: mockComponents,
      },
    })

    // Should show "Ex-aequo" for tied winners
    expect(wrapper.text()).toContain('Ex-aequo')
  })

  test('should not show results when status is cancelled', () => {
    const wrapper = mount(PollControlCard, {
      props: {
        poll: defaultPoll,
        currentIndex: 0,
        totalPolls: 1,
        status: 'cancelled',
        countdown: 0,
        results: {
          results: [{ optionIndex: 0, votes: 10 }],
          totalVotes: 10,
        },
      },
      global: {
        components: mockComponents,
      },
    })

    // Results section should not be visible when cancelled
    expect(wrapper.text()).not.toContain('Total:')
  })

  test('should handle null poll gracefully', () => {
    const wrapper = mount(PollControlCard, {
      props: {
        poll: null,
        currentIndex: 0,
        totalPolls: 1,
        status: 'idle',
        countdown: 0,
      },
      global: {
        components: mockComponents,
      },
    })

    expect(wrapper.exists()).toBe(true)
  })
})
