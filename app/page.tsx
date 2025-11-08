import EventCard from "@/components/EventCard";
import ExploreBtn from "@/components/ExploreBtn";
import { events } from "@/lib/constants";

const Home = () => {
  return (
    <section>
      <h1 className="text-center">
        The hub for Every Dev <br /> Event You Mustn't Miss
      </h1>
      <p className="text-center mt-5">
        Hackathons, Meetups, and conferences, All in One Place
      </p>
      <ExploreBtn />

      <div className="mt-20 space-y-2">
        <h3>Featured Events</h3>

        <ul className="events">
          {events.map((event) => (
            <li key={event.image}>
              <EventCard {...event} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default Home;
